import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, connect, disconnect, agent } from "./setup.js";

beforeAll(() => connect("auth"));
afterAll(() => disconnect());

describe("auth", () => {
  it("registers, keeps a httpOnly cookie and returns the user", async () => {
    const a = request.agent(app);
    const r = await a.post("/api/auth/register").send({ name: "Tina Teacher", email: "TINA@x.io", password: "password123", role: "teacher" });
    expect(r.status).toBe(201);
    expect(r.body.user).toMatchObject({ email: "tina@x.io", role: "teacher" });
    expect(r.body.user.password).toBeUndefined();
    expect(r.headers["set-cookie"][0]).toMatch(/cm_token=.*HttpOnly/i);
    const me = await a.get("/api/auth/me");
    expect(me.body.user.name).toBe("Tina Teacher");
  });

  it("rejects duplicates, weak passwords and bad roles", async () => {
    const base = { name: "Dup", email: "tina@x.io", password: "password123", role: "teacher" };
    expect((await request(app).post("/api/auth/register").send(base)).status).toBe(409);
    const weak = await request(app).post("/api/auth/register").send({ ...base, email: "w@x.io", password: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.error).toMatch(/at least 8/);
    expect((await request(app).post("/api/auth/register").send({ ...base, email: "r@x.io", role: "admin" })).status).toBe(400);
  });

  it("logs in, logs out and protects routes", async () => {
    expect((await request(app).get("/api/classes")).status).toBe(401);
    const a = request.agent(app);
    expect((await a.post("/api/auth/login").send({ email: "tina@x.io", password: "nope" })).status).toBe(401);
    expect((await a.post("/api/auth/login").send({ email: "tina@x.io", password: "password123" })).status).toBe(200);
    expect((await a.get("/api/classes")).status).toBe(200);
    await a.post("/api/auth/logout");
    expect((await a.get("/api/classes")).status).toBe(401);
  });

  it("updates profile and password", async () => {
    const s = await agent("student", "Sam Student");
    expect((await s.patch("/api/auth/me").send({ rollNo: "23BIT001" })).body.user.rollNo).toBe("23BIT001");
    expect((await s.post("/api/auth/me/password").send({ current: "wrong", next: "newpassword1" })).status).toBe(400);
    expect((await s.post("/api/auth/me/password").send({ current: "password123", next: "newpassword1" })).status).toBe(200);
    const again = await request(app).post("/api/auth/login").send({ email: "sam.student@test.io", password: "newpassword1" });
    expect(again.status).toBe(200);
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const r = await request(app).get("/api/auth/nope");
    expect(r.status).toBe(404);
    expect(r.body.error).toBeTruthy();
  });
});
