const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["teacher", "student"], required: true },
    rollNo: { type: String, trim: true, maxlength: 20 },
    avatarColor: { type: String, default: () => `hsl(${Math.floor(Math.random() * 360)} 65% 45%)` },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hash() {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.checkPassword = function check(pw) {
  return bcrypt.compare(pw, this.password);
};

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, name: this.name, email: this.email, role: this.role, rollNo: this.rollNo, avatarColor: this.avatarColor };
};

module.exports = mongoose.model("User", userSchema);
