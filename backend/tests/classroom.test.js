import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, disconnect, agent } from "./setup.js";

let teacher, s1, s2, outsider, classId, code;

beforeAll(async () => {
  await connect("classroom");
  teacher = await agent("teacher", "Neha Teacher");
  s1 = await agent("student", "Aarav One", { rollNo: "R1" });
  s2 = await agent("student", "Diya Two", { rollNo: "R2" });
  outsider = await agent("student", "Olga Out");
});
afterAll(() => disconnect());

describe("classes", () => {
  it("only teachers create classes and get a join code", async () => {
    expect((await s1.post("/api/classes").send({ name: "Nope" })).status).toBe(403);
    const r = await teacher.post("/api/classes").send({ name: "DBMS", subject: "Databases", section: "A" });
    expect(r.status).toBe(201);
    expect(r.body.class.code).toMatch(/^[A-Z2-9]{6}$/);
    ({ id: classId, code } = r.body.class);
  });

  it("students join with the code (case-insensitive) and teacher is notified", async () => {
    expect((await s1.post("/api/classes/join").send({ code: "ZZZZZZ" })).status).toBe(404);
    expect((await s1.post("/api/classes/join").send({ code: code.toLowerCase() })).status).toBe(200);
    expect((await s1.post("/api/classes/join").send({ code })).status).toBe(409);
    await s2.post("/api/classes/join").send({ code });
    const n = await teacher.get("/api/me/notifications");
    expect(n.body.unread).toBe(2);
    expect(n.body.items[0].title).toMatch(/joined DBMS/);
  });

  it("hides the join code from students and blocks outsiders", async () => {
    const r = await s1.get(`/api/classes/${classId}`);
    expect(r.body.class.code).toBeUndefined();
    expect(r.body.class.people.map((p) => p.name)).toEqual(["Aarav One", "Diya Two"]);
    expect((await outsider.get(`/api/classes/${classId}`)).status).toBe(403);
    expect((await outsider.get("/api/classes/000000000000000000000000")).status).toBe(404);
  });

  it("teacher edits, rotates code and sets a validated timetable", async () => {
    expect((await s1.patch(`/api/classes/${classId}`).send({ name: "X" })).status).toBe(403);
    expect((await teacher.patch(`/api/classes/${classId}`).send({ room: "LT-3" })).body.class.room).toBe("LT-3");
    const newCode = (await teacher.post(`/api/classes/${classId}/code`)).body.code;
    expect(newCode).not.toBe(code);
    const bad = await teacher.put(`/api/classes/${classId}/timetable`).send({ slots: [{ day: 0, start: "10:00", end: "09:00" }] });
    expect(bad.status).toBe(400);
    const ok = await teacher.put(`/api/classes/${classId}/timetable`).send({ slots: [
      { day: 2, start: "11:00", end: "12:00" }, { day: 0, start: "09:00", end: "10:00", room: "Lab" }] });
    expect(ok.body.timetable.map((s) => s.day)).toEqual([0, 2]);
    const tt = await s1.get("/api/me/timetable");
    expect(tt.body.slots).toHaveLength(2);
    expect(tt.body.slots[0]).toMatchObject({ name: "DBMS", room: "Lab" });
  });

  it("stream: teacher posts, members comment, permissions enforced", async () => {
    expect((await s1.post(`/api/classes/${classId}/posts`).send({ body: "hi" })).status).toBe(403);
    const p = await teacher.post(`/api/classes/${classId}/posts`).send({ body: "Quiz on Friday", pinned: true });
    expect(p.status).toBe(201);
    const pid = p.body.post.id;
    const c = await s1.post(`/api/classes/${classId}/posts/${pid}/comments`).send({ body: "Which units?" });
    expect(c.body.post.comments[0]).toMatchObject({ body: "Which units?", canDelete: true });
    const cid = c.body.post.comments[0].id;
    expect((await s2.delete(`/api/classes/${classId}/posts/${pid}/comments/${cid}`)).status).toBe(403);
    expect((await teacher.delete(`/api/classes/${classId}/posts/${pid}/comments/${cid}`)).status).toBe(200);
    const list = await s2.get(`/api/classes/${classId}/posts`);
    expect(list.body.posts[0]).toMatchObject({ body: "Quiz on Friday", pinned: true, canEdit: false });
    const notes = await s2.get("/api/me/notifications");
    expect(notes.body.items.some((n) => n.type === "announcement")).toBe(true);
    await s2.post("/api/me/notifications/read");
    expect((await s2.get("/api/me/notifications")).body.unread).toBe(0);
  });

  it("students can leave; teacher can remove; teacher cannot leave", async () => {
    expect((await teacher.delete(`/api/classes/${classId}/students/${teacher.user.id}`)).status).toBe(400);
    expect((await s2.delete(`/api/classes/${classId}/students/${s1.user.id}`)).status).toBe(403);
    expect((await s2.delete(`/api/classes/${classId}/students/${s2.user.id}`)).status).toBe(200);
    expect((await s2.get(`/api/classes/${classId}`)).status).toBe(403);
  });
});
