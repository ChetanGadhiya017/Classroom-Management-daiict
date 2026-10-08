const express = require("express");
const { z } = require("zod");
const Classroom = require("../models/Classroom");
const Post = require("../models/Post");
const { Assignment, Submission } = require("../models/Assignment");
const Attendance = require("../models/Attendance");
const Notification = require("../models/Notification");
const { validate } = require("../middleware/validate");
const { requireRole, loadClassroom } = require("../middleware/auth");
const { joinCode } = require("../lib/codes");
const { badRequest, notFound, forbidden, conflict } = require("../lib/http");

const router = express.Router();
const THEMES = ["indigo", "emerald", "rose", "amber", "sky", "violet", "teal", "slate"];

const classFields = z.object({
  name: z.string().trim().min(2, "Class name is required").max(100),
  subject: z.string().trim().max(100).optional().default(""),
  section: z.string().trim().max(40).optional().default(""),
  room: z.string().trim().max(40).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  theme: z.enum(THEMES).optional(),
});

async function uniqueCode() {
  for (;;) {
    const code = joinCode();
    if (!(await Classroom.exists({ code }))) return code;
  }
}

function summary(c, userId) {
  return {
    id: c._id, name: c.name, subject: c.subject, section: c.section, room: c.room, theme: c.theme,
    teacher: c.teacher?.name ? { id: c.teacher._id, name: c.teacher.name, avatarColor: c.teacher.avatarColor } : c.teacher,
    students: c.students.length, role: c.role(userId), archived: c.archived,
    code: c.role(userId) === "teacher" ? c.code : undefined,
  };
}

router.get("/", async (req, res) => {
  const classes = await Classroom.find({ $or: [{ teacher: req.user._id }, { students: req.user._id }] })
    .populate("teacher", "name avatarColor").sort({ archived: 1, createdAt: -1 });
  res.json({ classes: classes.map((c) => summary(c, req.user._id)) });
});

router.post("/", requireRole("teacher"), validate(classFields), async (req, res) => {
  const c = await Classroom.create({ ...req.body, theme: req.body.theme || THEMES[Math.floor(Math.random() * THEMES.length)],
    code: await uniqueCode(), teacher: req.user._id });
  await c.populate("teacher", "name avatarColor");
  res.status(201).json({ class: summary(c, req.user._id) });
});

router.post("/join", requireRole("student"), validate(z.object({ code: z.string().trim().toUpperCase().length(6, "Codes have 6 characters") })), async (req, res) => {
  const c = await Classroom.findOne({ code: req.body.code, archived: false });
  if (!c) throw notFound("No active class with that code");
  if (c.role(req.user._id)) throw conflict("You are already in this class");
  c.students.push(req.user._id);
  await c.save();
  await Notification.fanOut([c.teacher], { type: "joined", title: `${req.user.name} joined ${c.name}`, classroom: c._id, link: `/classes/${c._id}/people` });
  await c.populate("teacher", "name avatarColor");
  res.json({ class: summary(c, req.user._id) });
});

router.get("/:classId", loadClassroom(), async (req, res) => {
  const c = await req.classroom.populate([{ path: "teacher", select: "name email avatarColor" },
    { path: "students", select: "name email rollNo avatarColor", options: { sort: { name: 1 } } }]);
  res.json({ class: { ...summary(c, req.user._id), description: c.description, timetable: c.timetable,
    teacher: c.teacher.toPublic(), people: c.students.map((s) => s.toPublic()) } });
});

router.patch("/:classId", loadClassroom({ teacherOnly: true }), validate(classFields.partial().extend({ archived: z.boolean().optional() })),
  async (req, res) => {
    Object.assign(req.classroom, req.body);
    await req.classroom.save();
    await req.classroom.populate("teacher", "name avatarColor");
    res.json({ class: summary(req.classroom, req.user._id) });
  });

router.post("/:classId/code", loadClassroom({ teacherOnly: true }), async (req, res) => {
  req.classroom.code = await uniqueCode();
  await req.classroom.save();
  res.json({ code: req.classroom.code });
});

router.put("/:classId/timetable", loadClassroom({ teacherOnly: true }), validate(z.object({
  slots: z.array(z.object({
    day: z.number().int().min(0).max(6),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    room: z.string().trim().max(40).optional().default(""),
  }).refine((s) => s.end > s.start, "End time must be after start time")).max(30),
})), async (req, res) => {
  req.classroom.timetable = req.body.slots.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  await req.classroom.save();
  res.json({ timetable: req.classroom.timetable });
});

router.delete("/:classId/students/:userId", loadClassroom(), async (req, res) => {
  const self = String(req.user._id) === req.params.userId;
  if (!self && req.classRole !== "teacher") throw forbidden();
  if (self && req.classRole === "teacher") throw badRequest("Teachers can't leave their own class. Archive or delete it instead.");
  req.classroom.students = req.classroom.students.filter((s) => String(s) !== req.params.userId);
  await req.classroom.save();
  res.json({ ok: true });
});

router.delete("/:classId", loadClassroom({ teacherOnly: true }), async (req, res) => {
  const id = req.classroom._id;
  const assignments = await Assignment.find({ classroom: id }, "_id");
  await Promise.all([
    Submission.deleteMany({ assignment: { $in: assignments.map((a) => a._id) } }),
    Assignment.deleteMany({ classroom: id }), Post.deleteMany({ classroom: id }),
    Attendance.deleteMany({ classroom: id }), Notification.deleteMany({ classroom: id }),
  ]);
  await req.classroom.deleteOne();
  res.json({ ok: true });
});

module.exports = { router, THEMES };
