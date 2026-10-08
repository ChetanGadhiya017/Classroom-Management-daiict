const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const User = require("../models/User");
const config = require("../config");
const { validate } = require("../middleware/validate");
const { requireAuth, issue, COOKIE, cookieOptions } = require("../middleware/auth");
const { badRequest, conflict, unauthorized } = require("../lib/http");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.env === "test" ? 1000 : 30, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." } });

const password = z.string().min(8, "Password must be at least 8 characters").max(128);

router.post("/register", limiter, validate(z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
  role: z.enum(["teacher", "student"]),
  rollNo: z.string().trim().max(20).optional(),
})), async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw conflict("An account with this email already exists");
  const user = await User.create(req.body);
  issue(res, user);
  res.status(201).json({ user: user.toPublic() });
});

router.post("/login", limiter, validate(z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+password");
  if (!user || !(await user.checkPassword(req.body.password))) throw unauthorized("Wrong email or password");
  issue(res, user);
  res.json({ user: user.toPublic() });
});

router.post("/logout", (_req, res) => {
  const { maxAge, ...opts } = cookieOptions(); // eslint-disable-line no-unused-vars
  res.clearCookie(COOKIE, opts);
  res.json({ ok: true });
});

/** Like /me but never 401s: the app calls this on load to find out whether someone is signed in. */
router.get("/session", async (req, res, next) => {
  if (!req.cookies?.[COOKIE]) return res.json({ user: null });
  try {
    await requireAuth(req, res, () => {});
    res.json({ user: req.user.toPublic() });
  } catch (err) {
    if (err.status === 401) return res.json({ user: null });
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

router.patch("/me", requireAuth, validate(z.object({
  name: z.string().trim().min(2).max(80).optional(),
  rollNo: z.string().trim().max(20).optional(),
})), async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

router.post("/me/password", requireAuth, validate(z.object({ current: z.string().min(1), next: password })), async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.checkPassword(req.body.current))) throw badRequest("Current password is incorrect");
  user.password = req.body.next;
  await user.save();
  res.json({ ok: true });
});

module.exports = router;
