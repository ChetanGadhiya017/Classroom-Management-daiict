const fs = require("fs");
const path = require("path");
const express = require("express");
const { z } = require("zod");
const config = require("../config");
const { Assignment, Submission } = require("../models/Assignment");
const Notification = require("../models/Notification");
const { validate } = require("../middleware/validate");
const { loadClassroom } = require("../middleware/auth");
const { upload, toFiles } = require("../middleware/upload");
const { notFound, forbidden, badRequest } = require("../lib/http");

const router = express.Router({ mergeParams: true });

const assignmentFields = z.object({
  title: z.string().trim().min(2, "Give the assignment a title").max(150),
  instructions: z.string().trim().max(10000).optional().default(""),
  points: z.coerce.number().int().min(0).max(1000).optional().default(100),
  due: z.union([z.literal(""), z.coerce.date()]).optional().transform((v) => (v === "" ? null : v)),
  topic: z.string().trim().max(60).optional().default(""),
  allowLate: z.preprocess((v) => v === undefined ? undefined : v === true || v === "true", z.boolean().optional()),
});

function statusOf(a, sub, now = new Date()) {
  if (sub?.gradedAt) return "graded";
  if (sub?.submittedAt) return sub.late ? "late" : "submitted";
  if (a.due && a.due < now) return "missing";
  return "assigned";
}

const files = (list = []) => list.map((f) => ({ id: f._id, name: f.name, path: f.path, size: f.size, mime: f.mime }));

function serializeSubmission(s) {
  return s && {
    id: s._id, text: s.text, files: files(s.files), submittedAt: s.submittedAt, late: s.late,
    grade: s.grade, feedback: s.feedback, gradedAt: s.gradedAt,
    student: s.student?.name ? { id: s.student._id, name: s.student.name, rollNo: s.student.rollNo, avatarColor: s.student.avatarColor } : s.student,
  };
}

function serialize(a) {
  return { id: a._id, title: a.title, instructions: a.instructions, points: a.points, due: a.due, topic: a.topic,
    attachments: files(a.attachments), allowLate: a.allowLate, createdAt: a.createdAt, classroom: a.classroom };
}

async function getAssignment(req) {
  const a = /^[a-f\d]{24}$/i.test(req.params.aid) && await Assignment.findOne({ _id: req.params.aid, classroom: req.classroom._id });
  if (!a) throw notFound("Assignment not found");
  return a;
}

function removeFiles(files = []) {
  for (const f of files) fs.rm(path.join(config.uploadDir, f.path), { force: true }, () => {});
}

// ---------------------------------------------------------------- list / create
router.get("/", loadClassroom(), async (req, res) => {
  const list = await Assignment.find({ classroom: req.classroom._id }).sort({ due: 1, createdAt: -1 });
  const ids = list.map((a) => a._id);
  if (req.classRole === "teacher") {
    // Counted in JS (not $group/$cond) so it works on any MongoDB-compatible store.
    const subs = await Submission.find({ assignment: { $in: ids }, submittedAt: { $ne: null } }, "assignment gradedAt");
    const counts = [];
    const acc = {};
    for (const s of subs) {
      const k = String(s.assignment);
      if (!acc[k]) counts.push((acc[k] = { _id: k, turnedIn: 0, graded: 0 }));
      acc[k].turnedIn += 1;
      if (s.gradedAt) acc[k].graded += 1;
    }
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    return res.json({ assignments: list.map((a) => ({ ...serialize(a),
      turnedIn: byId[a._id]?.turnedIn || 0, graded: byId[a._id]?.graded || 0, students: req.classroom.students.length })) });
  }
  const subs = await Submission.find({ assignment: { $in: ids }, student: req.user._id });
  const mine = Object.fromEntries(subs.map((s) => [String(s.assignment), s]));
  res.json({ assignments: list.map((a) => ({ ...serialize(a), status: statusOf(a, mine[a._id]),
    grade: mine[a._id]?.gradedAt ? mine[a._id].grade : undefined })) });
});

router.post("/", loadClassroom({ teacherOnly: true }), upload.array("files", 5), validate(assignmentFields), async (req, res) => {
  const a = await Assignment.create({ ...req.body, classroom: req.classroom._id, author: req.user._id, attachments: toFiles(req.files) });
  await Notification.fanOut(req.classroom.students, { type: "assignment", classroom: req.classroom._id,
    title: `New assignment in ${req.classroom.name}: ${a.title}`, link: `/classes/${req.classroom._id}/assignments/${a._id}` });
  res.status(201).json({ assignment: serialize(a) });
});

// ---------------------------------------------------------------- detail / edit / delete
router.get("/:aid", loadClassroom(), async (req, res) => {
  const a = await getAssignment(req);
  if (req.classRole === "teacher") {
    await req.classroom.populate({ path: "students", select: "name rollNo avatarColor", options: { sort: { name: 1 } } });
    const subs = await Submission.find({ assignment: a._id });
    const byStudent = Object.fromEntries(subs.map((s) => [String(s.student), s]));
    const roster = req.classroom.students.map((st) => {
      const s = byStudent[st._id];
      return { student: { id: st._id, name: st.name, rollNo: st.rollNo, avatarColor: st.avatarColor },
        status: statusOf(a, s), submission: s ? serializeSubmission(s) : null };
    });
    return res.json({ assignment: serialize(a), role: "teacher", roster });
  }
  const s = await Submission.findOne({ assignment: a._id, student: req.user._id });
  res.json({ assignment: serialize(a), role: "student", status: statusOf(a, s), submission: serializeSubmission(s) });
});

router.patch("/:aid", loadClassroom({ teacherOnly: true }), upload.array("files", 5), validate(assignmentFields.partial()), async (req, res) => {
  const a = await getAssignment(req);
  Object.assign(a, req.body);
  if (req.files?.length) a.attachments.push(...toFiles(req.files));
  await a.save();
  res.json({ assignment: serialize(a) });
});

router.delete("/:aid/attachments/:fileId", loadClassroom({ teacherOnly: true }), async (req, res) => {
  const a = await getAssignment(req);
  const f = a.attachments.id(req.params.fileId);
  if (!f) throw notFound("File not found");
  removeFiles([f]);
  f.deleteOne();
  await a.save();
  res.json({ assignment: serialize(a) });
});

router.delete("/:aid", loadClassroom({ teacherOnly: true }), async (req, res) => {
  const a = await getAssignment(req);
  const subs = await Submission.find({ assignment: a._id });
  subs.forEach((s) => removeFiles(s.files));
  removeFiles(a.attachments);
  await Submission.deleteMany({ assignment: a._id });
  await a.deleteOne();
  res.json({ ok: true });
});

// ---------------------------------------------------------------- student submission
router.put("/:aid/submission", loadClassroom(), upload.array("files", 5), validate(z.object({
  text: z.string().trim().max(10000).optional().default(""),
  keep: z.preprocess((v) => (v === undefined ? [] : [].concat(v)), z.array(z.string())).optional(),
})), async (req, res) => {
  if (req.classRole !== "student") throw forbidden("Only students submit work");
  const a = await getAssignment(req);
  const now = new Date();
  const late = Boolean(a.due && now > a.due);
  if (late && !a.allowLate) {
    removeFiles(toFiles(req.files));
    throw badRequest("The due date has passed and late work is not accepted");
  }
  let s = await Submission.findOne({ assignment: a._id, student: req.user._id });
  if (s?.gradedAt) {
    removeFiles(toFiles(req.files));
    throw badRequest("This work has already been graded");
  }
  if (!s) s = new Submission({ assignment: a._id, student: req.user._id });
  const keep = new Set(req.body.keep || []);
  const dropped = s.files.filter((f) => !keep.has(String(f._id)));
  removeFiles(dropped);
  s.files = [...s.files.filter((f) => keep.has(String(f._id))), ...toFiles(req.files)];
  if (!s.text && !req.body.text && !s.files.length) throw badRequest("Add a file or some text before turning in");
  s.text = req.body.text;
  s.submittedAt = now;
  s.late = late;
  await s.save();
  await Notification.fanOut([req.classroom.teacher], { type: "submission", classroom: req.classroom._id,
    title: `${req.user.name} turned in ${a.title}${late ? " (late)" : ""}`, link: `/classes/${req.classroom._id}/assignments/${a._id}` });
  res.json({ status: statusOf(a, s), submission: serializeSubmission(s) });
});

router.delete("/:aid/submission", loadClassroom(), async (req, res) => {
  const a = await getAssignment(req);
  const s = await Submission.findOne({ assignment: a._id, student: req.user._id });
  if (!s || !s.submittedAt) throw notFound("Nothing to unsubmit");
  if (s.gradedAt) throw badRequest("Graded work can't be unsubmitted");
  s.submittedAt = null;
  s.late = false;
  await s.save();
  res.json({ status: statusOf(a, s), submission: serializeSubmission(s) });
});

// ---------------------------------------------------------------- grading
router.post("/:aid/grade/:studentId", loadClassroom({ teacherOnly: true }), validate(z.object({
  grade: z.coerce.number().min(0), feedback: z.string().trim().max(5000).optional().default(""),
})), async (req, res) => {
  const a = await getAssignment(req);
  if (req.body.grade > a.points) throw badRequest(`Grade can't exceed ${a.points} points`);
  if (!req.classroom.students.some((s) => String(s) === req.params.studentId)) throw notFound("Student not in this class");
  const s = await Submission.findOneAndUpdate(
    { assignment: a._id, student: req.params.studentId },
    { $set: { grade: req.body.grade, feedback: req.body.feedback, gradedAt: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  await Notification.fanOut([s.student], { type: "grade", classroom: req.classroom._id,
    title: `${a.title}: ${req.body.grade}/${a.points}`, link: `/classes/${req.classroom._id}/assignments/${a._id}` });
  res.json({ status: statusOf(a, s), submission: serializeSubmission(s) });
});

router.delete("/:aid/grade/:studentId", loadClassroom({ teacherOnly: true }), async (req, res) => {
  const a = await getAssignment(req);
  const s = await Submission.findOneAndUpdate({ assignment: a._id, student: req.params.studentId },
    { $unset: { grade: 1, gradedAt: 1 } }, { new: true });
  if (!s) throw notFound("No submission");
  res.json({ status: statusOf(a, s), submission: serializeSubmission(s) });
});

module.exports = { router, statusOf };
