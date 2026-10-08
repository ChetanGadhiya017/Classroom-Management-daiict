const fs = require("fs");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const multer = require("multer");
const config = require("./config");
const { HttpError } = require("./lib/http");
const { requireAuth } = require("./middleware/auth");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  if (config.env === "development") app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "up" : "down" }));
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/auth", (_req, _res, next) => next(new HttpError(404, "API route not found")));

  const api = express.Router();
  api.use(requireAuth);
  api.use("/classes", require("./routes/classes").router);
  api.use("/classes/:classId/posts", require("./routes/stream"));
  api.use("/classes/:classId/assignments", require("./routes/assignments").router);
  api.use("/classes/:classId/attendance", require("./routes/attendance").router);
  api.use("/me", require("./routes/me"));
  app.use("/api", api);
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "API route not found")));

  // Serve the built React app when it exists (single-container deployment).
  const dist = path.join(__dirname, "..", "..", "frontend", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: "1h", index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? `Files must be under ${config.maxUploadMb} MB` : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: Object.values(err.errors)[0]?.message || "Invalid data" });
    }
    if (err?.code === 11000) return res.status(409).json({ error: "That already exists" });
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 && config.env === "production" ? "Something went wrong" : err.message, details: err.details });
  });
  return app;
}

module.exports = { createApp };
