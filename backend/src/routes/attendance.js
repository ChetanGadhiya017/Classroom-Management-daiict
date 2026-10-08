const express = require("express");
const { z } = require("zod");
const Attendance = require("../models/Attendance");
const { validate } = require("../middleware/validate");
const { loadClassroom } = require("../middleware/auth");
const { badRequest, notFound } = require("../lib/http");

const router = express.Router({ mergeParams: true });
const ATTENDED = new Set(["present", "late"]);

function percent(records) {
  const counted = records.filter((r) => r.status !== "excused");
  if (!counted.length) return null;
  return Math.round((1000 * counted.filter((r) => ATTENDED.has(r.status)).length) / counted.length) / 10;
}

router.get("/", loadClassroom(), async (req, res) => {
  const sessions = await Attendance.find({ classroom: req.classroom._id }).sort({ date: -1 });
  if (req.classRole === "teacher") {
    await req.classroom.populate({ path: "students", select: "name rollNo avatarColor", options: { sort: { name: 1 } } });
    const perStudent = req.classroom.students.map((st) => {
      const recs = sessions.flatMap((s) => s.records.filter((r) => String(r.student) === String(st._id)));
      return { student: { id: st._id, name: st.name, rollNo: st.rollNo, avatarColor: st.avatarColor },
        present: recs.filter((r) => r.status === "present").length, late: recs.filter((r) => r.status === "late").length,
        absent: recs.filter((r) => r.status === "absent").length, percent: percent(recs) };
    });
    return res.json({ role: "teacher", sessions: sessions.map((s) => ({ id: s._id, date: s.date, topic: s.topic, records: s.records,
      percent: percent(s.records) })), students: perStudent });
  }
  const mine = sessions.map((s) => ({ date: s.date, topic: s.topic,
    status: s.records.find((r) => String(r.student) === String(req.user._id))?.status || null }));
  res.json({ role: "student", sessions: mine, percent: percent(mine.filter((m) => m.status)) });
});

router.put("/:date", loadClassroom({ teacherOnly: true }), validate(z.object({
  topic: z.string().trim().max(150).optional().default(""),
  records: z.array(z.object({ student: z.string().regex(/^[a-f\d]{24}$/i), status: z.enum(["present", "late", "absent", "excused"]) })).max(500),
})), async (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw badRequest("Date must be YYYY-MM-DD");
  const members = new Set(req.classroom.students.map(String));
  const records = req.body.records.filter((r) => members.has(r.student));
  const doc = await Attendance.findOneAndUpdate(
    { classroom: req.classroom._id, date },
    { $set: { topic: req.body.topic, records, takenBy: req.user._id } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  res.json({ session: { id: doc._id, date: doc.date, topic: doc.topic, records: doc.records, percent: percent(doc.records) } });
});

router.delete("/:date", loadClassroom({ teacherOnly: true }), async (req, res) => {
  const r = await Attendance.deleteOne({ classroom: req.classroom._id, date: req.params.date });
  if (!r.deletedCount) throw notFound("No attendance for that date");
  res.json({ ok: true });
});

module.exports = { router, percent };
