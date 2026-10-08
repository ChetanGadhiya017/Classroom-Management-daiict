require("dotenv").config();

const env = process.env.NODE_ENV || "development";

module.exports = {
  env,
  port: Number(process.env.PORT) || 8000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classroom",
  jwtSecret: process.env.JWT_SECRET || (env === "production" ? null : "dev-only-secret-change-me"),
  jwtExpires: process.env.JWT_EXPIRES || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR || require("path").join(__dirname, "..", "uploads"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
};

if (!module.exports.jwtSecret) {
  throw new Error("JWT_SECRET must be set in production");
}
