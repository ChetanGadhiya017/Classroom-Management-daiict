const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  day: { type: Number, min: 0, max: 6, required: true }, // 0 = Monday
  start: { type: String, match: /^\d{2}:\d{2}$/, required: true },
  end: { type: String, match: /^\d{2}:\d{2}$/, required: true },
  room: { type: String, trim: true, maxlength: 40 },
});

const classroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    subject: { type: String, trim: true, maxlength: 100 },
    section: { type: String, trim: true, maxlength: 40 },
    room: { type: String, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 2000 },
    theme: { type: String, default: "indigo" },
    code: { type: String, required: true, unique: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    timetable: [slotSchema],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

classroomSchema.methods.role = function role(userId) {
  const id = String(userId);
  if (String(this.teacher?._id || this.teacher) === id) return "teacher";
  if (this.students.some((s) => String(s._id || s) === id)) return "student";
  return null;
};

module.exports = mongoose.model("Classroom", classroomSchema);
