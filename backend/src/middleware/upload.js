const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const config = require("../config");
const { badRequest } = require("../lib/http");

fs.mkdirSync(config.uploadDir, { recursive: true });

const ALLOWED = /\.(pdf|docx?|pptx?|xlsx?|txt|md|csv|zip|png|jpe?g|gif|webp|c|cpp|h|java|py|js|ts|html|css|ipynb)$/i;

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.test(file.originalname) ? cb(null, true) : cb(badRequest(`File type not allowed: ${file.originalname}`)),
});

const toFiles = (files = []) =>
  files.map((f) => ({ name: path.basename(f.originalname).slice(0, 150), path: f.filename, size: f.size, mime: f.mimetype }));

module.exports = { upload, toFiles };
