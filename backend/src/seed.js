/* Demo data:  npm run seed   (drops the database first!) */
const mongoose = require("mongoose");
const config = require("./config");
const User = require("./models/User");
const Classroom = require("./models/Classroom");
const Post = require("./models/Post");
const Attendance = require("./models/Attendance");
const Notification = require("./models/Notification");
const { Assignment, Submission } = require("./models/Assignment");
const { joinCode } = require("./lib/codes");

const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Saanvi", "Arjun", "Isha", "Vihaan", "Ananya", "Dev", "Kiara", "Neel", "Tara", "Yash", "Riya", "Om", "Avni"];
const LAST = ["Shah", "Patel", "Mehta", "Iyer", "Nair", "Rao", "Desai", "Joshi", "Kapoor", "Reddy"];
const day = 24 * 3600 * 1000;
const iso = (d) => d.toISOString().slice(0, 10);
const endOfDay = (ms) => { const d = new Date(ms); d.setHours(23, 59, 0, 0); return d; };
const TENDENCY = [0.98, 0.95, 0.92, 0.9, 0.88, 0.85, 0.82, 0.78, 0.72, 0.65];

async function seed() {
  await mongoose.connect(config.mongoUri);
  await mongoose.connection.db.dropDatabase();

  const t1 = await User.create({ name: "Dr. Neha Sharma", email: "teacher@demo.local", password: "teacher123", role: "teacher" });
  const t2 = await User.create({ name: "Prof. Rakesh Iyer", email: "teacher2@demo.local", password: "teacher123", role: "teacher" });
  const students = [];
  for (let i = 0; i < 24; i++) {
    students.push(await User.create({ name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`, rollNo: `23BIT${String(i + 1).padStart(3, "0")}`,
      email: i === 0 ? "student@demo.local" : `student${i + 1}@demo.local`, password: "student123", role: "student" }));
  }
  const ids = students.map((s) => s._id);
  const specs = [
    { name: "Database Management Systems", subject: "DBMS", section: "Div A", room: "LT-3", theme: "indigo", teacher: t1,
      timetable: [{ day: 0, start: "09:00", end: "10:00" }, { day: 2, start: "11:00", end: "12:00" }, { day: 4, start: "14:00", end: "16:00", room: "Lab 2" }] },
    { name: "Operating Systems", subject: "OS", section: "Div A", room: "LT-1", theme: "emerald", teacher: t1,
      timetable: [{ day: 1, start: "10:00", end: "11:00" }, { day: 3, start: "09:00", end: "10:00" }] },
    { name: "Computer Networks", subject: "CN", section: "Div A", room: "LT-2", theme: "rose", teacher: t2,
      timetable: [{ day: 0, start: "11:00", end: "12:00" }, { day: 2, start: "09:00", end: "10:00" }, { day: 3, start: "14:00", end: "16:00", room: "Lab 4" }] },
  ];
  const now = Date.now();
  for (const [ci, s] of specs.entries()) {
    const c = await Classroom.create({ ...s, teacher: s.teacher._id, code: joinCode(), students: ids,
      description: `Lectures, assignments and lab work for ${s.subject}.` });
    await Post.create({ classroom: c._id, author: s.teacher._id, pinned: true,
      body: `Welcome to ${s.subject}! The syllabus and lab schedule are attached to the first assignment. Office hours: Thursday 4–5 pm.` });
    await Post.create({ classroom: c._id, author: s.teacher._id, body: "Reminder: quiz 1 covers units 1 and 2. Bring your ID card.",
      comments: [{ author: ids[1], body: "Will it be MCQ or written?" }, { author: s.teacher._id, body: "Both: 10 MCQs and 2 short answers." }] });
    const tasks = [
      { title: `${s.subject} Lab 1: Setup and basics`, due: endOfDay(now - 12 * day), points: 20, topic: "Labs" },
      { title: `${s.subject} Assignment 1`, due: endOfDay(now - 4 * day), points: 50, topic: "Assignments" },
      { title: `${s.subject} Lab 2`, due: endOfDay(now + 3 * day), points: 20, topic: "Labs" },
      { title: `${s.subject} Mini project proposal`, due: endOfDay(now + 9 * day), points: 100, topic: "Project" },
    ];
    for (const [ti, t] of tasks.entries()) {
      const a = await Assignment.create({ ...t, classroom: c._id, author: s.teacher._id,
        instructions: "Read the brief carefully. Submit a PDF or a zip with your code and a short README." });
      for (const [si, st] of students.entries()) {
        const r = (si * 7 + ti * 3 + ci) % 10;
        if (t.due > now && r < 6) continue;
        if (r === 9) continue; // missing
        const submittedAt = new Date(t.due - (r === 8 ? -day : day));
        const graded = t.due < now && r < 7;
        await Submission.create({ assignment: a._id, student: st._id, text: "Submitted, see attached report.", submittedAt, late: r === 8,
          ...(graded ? { grade: Math.round(t.points * (0.6 + (r % 5) * 0.09)), feedback: r % 2 ? "Good work." : "Nice. Add more test cases.", gradedAt: new Date(t.due.getTime() + 2 * day) } : {}) });
      }
    }
    for (let k = 1; k <= 10; k++) {
      const date = iso(new Date(now - k * 3 * day));
      await Attendance.create({ classroom: c._id, date, topic: `Lecture ${11 - k}`, takenBy: s.teacher._id,
        records: students.map((st, si) => {
          const p = TENDENCY[(si * 3 + ci) % TENDENCY.length];
          const r = ((si * 37 + k * 101 + ci * 53) % 100) / 100;
          return { student: st._id, status: r < p - 0.05 ? "present" : r < p ? "late" : "absent" };
        }) });
    }
  }
  await Notification.create({ user: students[0]._id, type: "grade", title: "DBMS Assignment 1: 41/50", link: "/" });
  await Notification.create({ user: students[0]._id, type: "assignment", title: "New assignment in OS: OS Mini project proposal", link: "/" });
  console.log("Seeded. Sign in with teacher@demo.local / teacher123 or student@demo.local / student123");
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
