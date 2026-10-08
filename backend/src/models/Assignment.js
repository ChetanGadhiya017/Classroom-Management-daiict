const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  { name: String, path: String, size: Number, mime: String },
  { _id: true },
);

const assignmentSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    instructions: { type: String, trim: true, maxlength: 10000 },
    points: { type: Number, min: 0, max: 1000, default: 100 },
    due: { type: Date },
    topic: { type: String, trim: true, maxlength: 60 },
    attachments: [fileSchema],
    allowLate: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, trim: true, maxlength: 10000 },
    files: [fileSchema],
    submittedAt: { type: Date },
    late: { type: Boolean, default: false },
    grade: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 5000 },
    gradedAt: { type: Date },
  },
  { timestamps: true },
);
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = {
  Assignment: mongoose.model("Assignment", assignmentSchema),
  Submission: mongoose.model("Submission", submissionSchema),
};
