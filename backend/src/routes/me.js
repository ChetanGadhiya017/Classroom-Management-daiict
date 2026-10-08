/** Cross-class views: dashboard, timetable, notifications, file downloads. */
const path = require("path");
const express = require("express");
const config = require("../config");
const Classroom = require("../models/Classroom");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const Attendance = require("../models/Attendance");
const { Assignment, Submission } = require("../models/Assignment");
const { statusOf } = require("./assignments");
const { percent } = require("./attendance");
const { notFound, forbidden } = require("../lib/http");

const router = express.Router();

async function myClasses(user) {
  return Classroom.find({ $or: [{ teacher: user._id }, { students: user._id }], archived: false })
    .populate("teacher", "name avatarColor");
}

router.get("/timetable", async (req, res) => {
  const classes = await myClasses(req.user);
  const slots = classes.flatMap((c) => c.timetable.map((s) => ({
    day: s.day, start: s.start, end: s.end, room: s.room || c.room, classId: c._id, name: c.name, subject: c.subject,
    section: c.section, theme: c.theme, teacher: c.teacher.name,
  })));
  slots.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  res.json({ slots });
});

router.get("/dashboard", async (req, res) => {
  const classes = await myClasses(req.user);
  const ids = classes.map((c) => c._id);
  const byId = Object.fromEntries(classes.map((c) => [String(c._id), c]));
  const today = (new Date().getDay() + 6) % 7; // Monday = 0
  const todaySlots = classes.flatMap((c) => c.timetable.filter((s) => s.day === today)
    .map((s) => ({ start: s.start, end: s.end, room: s.room || c.room, classId: c._id, name: c.name, theme: c.theme })))
    .sort((a, b) => a.start.localeCompare(b.start));
  const posts = await Post.find({ classroom: { $in: ids } }).sort({ createdAt: -1 }).limit(5).populate("author", "name avatarColor");
  const recent = posts.map((p) => ({ id: p._id, body: p.body.slice(0, 220), createdAt: p.createdAt, classId: p.classroom,
    className: byId[String(p.classroom)]?.name, author: p.author.name, avatarColor: p.author.avatarColor }));
  const assignments = await Assignment.find({ classroom: { $in: ids } }).sort({ due: 1 });

  if (req.user.role === "teacher") {
    const subs = await Submission.find({ assignment: { $in: assignments.map((a) => a._id) }, submittedAt: { $ne: null } }, "assignment gradedAt");
    const counts = [];
    const acc = {};
    for (const s of subs) {
      const k = String(s.assignment);
      if (!acc[k]) counts.push((acc[k] = { _id: k, turnedIn: 0, ungraded: 0 }));
      acc[k].turnedIn += 1;
      if (!s.gradedAt) acc[k].ungraded += 1;
    }
    const c = Object.fromEntries(counts.map((x) => [String(x._id), x]));
    const toGrade = assignments.filter((a) => c[a._id]?.ungraded).map((a) => ({ id: a._id, title: a.title, classId: a.classroom,
      className: byId[String(a.classroom)]?.name, ungraded: c[a._id].ungraded, turnedIn: c[a._id].turnedIn, due: a.due }));
    const students = new Set(classes.flatMap((x) => x.students.map(String)));
    return res.json({ role: "teacher", stats: { classes: classes.length, students: students.size, assignments: assignments.length,
      toGrade: toGrade.reduce((n, a) => n + a.ungraded, 0) }, today: todaySlots, toGrade, recent });
  }

  const subs = await Submission.find({ assignment: { $in: assignments.map((a) => a._id) }, student: req.user._id });
  const mine = Object.fromEntries(subs.map((s) => [String(s.assignment), s]));
  const items = assignments.map((a) => ({ id: a._id, title: a.title, due: a.due, points: a.points, classId: a.classroom,
    className: byId[String(a.classroom)]?.name, theme: byId[String(a.classroom)]?.theme, status: statusOf(a, mine[a._id]),
    grade: mine[a._id]?.gradedAt ? mine[a._id].grade : undefined }));
  const todo = items.filter((i) => i.status === "assigned" || i.status === "missing");
  const graded = items.filter((i) => i.status === "graded");
  const att = await Attendance.find({ classroom: { $in: ids } });
  const recs = att.flatMap((s) => s.records.filter((r) => String(r.student) === String(req.user._id)));
  res.json({ role: "student", stats: { classes: classes.length, todo: todo.length, missing: todo.filter((t) => t.status === "missing").length,
    attendance: percent(recs), average: graded.length ? Math.round(graded.reduce((n, g) => n + (100 * g.grade) / (g.points || 1), 0) / graded.length) : null },
    today: todaySlots, todo: todo.slice(0, 8), graded: graded.slice(-5).reverse(), recent });
});

router.get("/notifications", async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ unread, items: items.map((n) => ({ id: n._id, type: n.type, title: n.title, link: n.link, read: n.read, createdAt: n.createdAt })) });
});

router.post("/notifications/read", async (req, res) => {
  const filter = { user: req.user._id, read: false };
  if (req.body?.id) filter._id = req.body.id;
  await Notification.updateMany(filter, { $set: { read: true } });
  res.json({ ok: true });
});

/** Files are only served to members of the class they belong to (students: own submissions + assignment attachments). */
router.get("/files/:name", async (req, res) => {
  const name = path.basename(req.params.name);
  const a = await Assignment.findOne({ "attachments.path": name });
  let classId = a?.classroom;
  let file = a?.attachments.find((f) => f.path === name);
  let owner = null;
  if (!a) {
    const s = await Submission.findOne({ "files.path": name }).populate("assignment", "classroom");
    if (!s) throw notFound("File not found");
    classId = s.assignment.classroom;
    file = s.files.find((f) => f.path === name);
    owner = String(s.student);
  }
  const c = await Classroom.findById(classId);
  const role = c?.role(req.user._id);
  if (!role || (owner && role === "student" && owner !== String(req.user._id))) throw forbidden();
  res.download(path.join(config.uploadDir, name), file.name);
});

module.exports = router;
