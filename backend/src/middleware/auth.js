const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const Classroom = require("../models/Classroom");
const { unauthorized, forbidden, notFound } = require("../lib/http");

const COOKIE = "cm_token";
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: config.env === "production",
  maxAge: 7 * 24 * 3600 * 1000,
  path: "/",
});

function issue(res, user) {
  const token = jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpires });
  res.cookie(COOKIE, token, cookieOptions());
  return token;
}

async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = req.cookies?.[COOKIE] || (header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Your session has expired. Please sign in again.");
  }
  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw forbidden();
  next();
};

/** Loads req.classroom for :classId and checks membership (and optionally teacher-only). */
const loadClassroom = ({ teacherOnly = false } = {}) => async (req, _res, next) => {
  const id = req.params.classId;
  const classroom = /^[a-f\d]{24}$/i.test(id) ? await Classroom.findById(id) : null;
  if (!classroom) throw notFound("Class not found");
  const role = classroom.role(req.user._id);
  if (!role) throw forbidden("You are not a member of this class");
  if (teacherOnly && role !== "teacher") throw forbidden("Only the teacher can do this");
  req.classroom = classroom;
  req.classRole = role;
  next();
};

module.exports = { requireAuth, requireRole, loadClassroom, issue, COOKIE, cookieOptions };
