const express = require("express");
const { z } = require("zod");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { validate } = require("../middleware/validate");
const { loadClassroom } = require("../middleware/auth");
const { notFound, forbidden } = require("../lib/http");

const router = express.Router({ mergeParams: true });
const AUTHOR = "name avatarColor role";

const serialize = (p, user, classRole) => ({
  id: p._id, body: p.body, pinned: p.pinned, createdAt: p.createdAt, updatedAt: p.updatedAt,
  author: { id: p.author._id, name: p.author.name, avatarColor: p.author.avatarColor, role: p.author.role },
  canEdit: String(p.author._id) === String(user._id) || classRole === "teacher",
  comments: p.comments.map((c) => ({
    id: c._id, body: c.body, createdAt: c.createdAt,
    author: { id: c.author._id, name: c.author.name, avatarColor: c.author.avatarColor },
    canDelete: String(c.author._id) === String(user._id) || classRole === "teacher",
  })),
});

async function getPost(req) {
  const p = /^[a-f\d]{24}$/i.test(req.params.postId) && await Post.findOne({ _id: req.params.postId, classroom: req.classroom._id });
  if (!p) throw notFound("Post not found");
  return p;
}

router.get("/", loadClassroom(), async (req, res) => {
  const posts = await Post.find({ classroom: req.classroom._id }).sort({ pinned: -1, createdAt: -1 }).limit(100)
    .populate("author", AUTHOR).populate("comments.author", AUTHOR);
  res.json({ posts: posts.map((p) => serialize(p, req.user, req.classRole)) });
});

router.post("/", loadClassroom({ teacherOnly: true }), validate(z.object({
  body: z.string().trim().min(1, "Write something first").max(5000), pinned: z.boolean().optional(),
})), async (req, res) => {
  const p = await Post.create({ ...req.body, classroom: req.classroom._id, author: req.user._id });
  await p.populate("author", AUTHOR);
  await Notification.fanOut(req.classroom.students, { type: "announcement", classroom: req.classroom._id,
    title: `${req.classroom.name}: ${req.body.body.slice(0, 80)}`, link: `/classes/${req.classroom._id}` });
  res.status(201).json({ post: serialize(p, req.user, req.classRole) });
});

router.patch("/:postId", loadClassroom(), validate(z.object({
  body: z.string().trim().min(1).max(5000).optional(), pinned: z.boolean().optional(),
})), async (req, res) => {
  const p = await getPost(req);
  if (String(p.author) !== String(req.user._id) && req.classRole !== "teacher") throw forbidden();
  Object.assign(p, req.body);
  await p.save();
  await p.populate([{ path: "author", select: AUTHOR }, { path: "comments.author", select: AUTHOR }]);
  res.json({ post: serialize(p, req.user, req.classRole) });
});

router.delete("/:postId", loadClassroom(), async (req, res) => {
  const p = await getPost(req);
  if (String(p.author) !== String(req.user._id) && req.classRole !== "teacher") throw forbidden();
  await p.deleteOne();
  res.json({ ok: true });
});

router.post("/:postId/comments", loadClassroom(), validate(z.object({ body: z.string().trim().min(1).max(2000) })), async (req, res) => {
  const p = await getPost(req);
  p.comments.push({ author: req.user._id, body: req.body.body });
  await p.save();
  await p.populate([{ path: "author", select: AUTHOR }, { path: "comments.author", select: AUTHOR }]);
  if (String(p.author._id) !== String(req.user._id)) {
    await Notification.fanOut([p.author._id], { type: "comment", classroom: req.classroom._id,
      title: `${req.user.name} commented: ${req.body.body.slice(0, 60)}`, link: `/classes/${req.classroom._id}` });
  }
  res.status(201).json({ post: serialize(p, req.user, req.classRole) });
});

router.delete("/:postId/comments/:commentId", loadClassroom(), async (req, res) => {
  const p = await getPost(req);
  const c = p.comments.id(req.params.commentId);
  if (!c) throw notFound("Comment not found");
  if (String(c.author) !== String(req.user._id) && req.classRole !== "teacher") throw forbidden();
  c.deleteOne();
  await p.save();
  res.json({ ok: true });
});

module.exports = router;
