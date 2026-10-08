import mongoose from "mongoose";
import request from "supertest";
import os from "os";
import path from "path";

process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "cm-test-uploads");
const { createApp } = await import("../src/app.js");

export const app = createApp();

export async function connect(name) {
  const base = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017";
  await mongoose.connect(`${base.replace(/\/$/, "")}/cm_test_${name}`);
  await mongoose.connection.db.dropDatabase();
}

export async function disconnect() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

/** Registers a user and returns a supertest agent that keeps the auth cookie. */
export async function agent(role, name = role, extra = {}) {
  const a = request.agent(app);
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@test.io`;
  const r = await a.post("/api/auth/register").send({ name, email, password: "password123", role, ...extra });
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  a.user = r.body.user;
  return a;
}
