const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["present", "late", "absent", "excused"], required: true },
  },
  { _id: false },
);

const attendanceSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: true }, // local calendar date
    topic: { type: String, trim: true, maxlength: 150 },
    records: [recordSchema],
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
attendanceSchema.index({ classroom: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
