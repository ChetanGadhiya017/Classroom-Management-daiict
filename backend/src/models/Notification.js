const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["announcement", "assignment", "grade", "submission", "comment", "joined"], required: true },
    title: { type: String, required: true, maxlength: 200 },
    link: { type: String, maxlength: 200 },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.statics.fanOut = function fanOut(userIds, data) {
  const docs = userIds.map((user) => ({ ...data, user }));
  return docs.length ? this.insertMany(docs) : [];
};

module.exports = mongoose.model("Notification", notificationSchema);
