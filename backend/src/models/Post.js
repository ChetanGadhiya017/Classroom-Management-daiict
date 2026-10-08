const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

const postSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    pinned: { type: Boolean, default: false },
    comments: [commentSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Post", postSchema);
