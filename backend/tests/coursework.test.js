import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, disconnect, agent } from "./setup.js";

let teacher, s1, s2, classId;
const day = 24 * 3600 * 1000;

beforeAll(async () => {
  await connect("coursework");
  teacher = await agent("teacher", "T Teacher");
  s1 = await agent("student", "S One");
  s2 = await agent("student", "S Two");
  const c = (await teacher.post("/api/classes").send({ name: "OS" })).body.class;
  classId = c.id;
  await s1.post("/api/classes/join").send({ code: c.code });
  await s2.post("/api/classes/join").send({ code: c.code });
});
afterAll(() => disconnect());

describe("assignments & grading", () => {
  let aid, pastId;

  it("teacher creates assignments with attachments (multipart)", async () => {
    const r = await teacher.post(`/api/classes/${classId}/assignments`)
      .field("title", "Lab 1").field("points", "20").field("due", new Date(Date.now() + 2 * day).toISOString())
      .attach("files", Buffer.from("brief"), "brief.pdf");
    expect(r.status).toBe(201);
    expect(r.body.assignment.attachments[0].name).toBe("brief.pdf");
    aid = r.body.assignment.id;
    const past = await teacher.post(`/api/classes/${classId}/assignments`).field("title", "Old lab").field("due", new Date(Date.now() - day).toISOString()).field("allowLate", "false");
    pastId = past.body.assignment.id;
    const bad = await teacher.post(`/api/classes/${classId}/assignments`).field("title", "Evil").attach("files", Buffer.from("x"), "run.exe");
    expect(bad.status).toBe(400);
  });

  it("students see status and can download attachments", async () => {
    const list = (await s1.get(`/api/classes/${classId}/assignments`)).body.assignments;
    expect(Object.fromEntries(list.map((a) => [a.title, a.status]))).toEqual({ "Lab 1": "assigned", "Old lab": "missing" });
    const a = (await s1.get(`/api/classes/${classId}/assignments/${aid}`)).body.assignment;
    const dl = await s1.get(`/api/me/files/${a.attachments[0].path}`);
    expect(dl.status).toBe(200);
    expect(dl.headers["content-disposition"]).toMatch(/brief\.pdf/);
  });

  it("submission rules: needs content, late policy, resubmit, privacy", async () => {
    expect((await s1.put(`/api/classes/${classId}/assignments/${aid}/submission`).field("text", " ")).status).toBe(400);
    const r = await s1.put(`/api/classes/${classId}/assignments/${aid}/submission`).field("text", "My answer").attach("files", Buffer.from("code"), "main.c");
    expect(r.body.status).toBe("submitted");
    const file = r.body.submission.files[0];
    expect((await s2.get(`/api/me/files/${file.path}`)).status).toBe(403); // classmates can't read it
    expect((await teacher.get(`/api/me/files/${file.path}`)).status).toBe(200);
    const re = await s1.put(`/api/classes/${classId}/assignments/${aid}/submission`).field("text", "v2").field("keep", file.id);
    expect(re.body.submission).toMatchObject({ text: "v2" });
    expect(re.body.submission.files).toHaveLength(1);
    const late = await s1.put(`/api/classes/${classId}/assignments/${pastId}/submission`).field("text", "sorry");
    expect(late.status).toBe(400);
    expect(late.body.error).toMatch(/late work is not accepted/);
    expect((await teacher.put(`/api/classes/${classId}/assignments/${aid}/submission`).field("text", "x")).status).toBe(403);
  });

  it("teacher sees roster with statuses and grades within points", async () => {
    const d = (await teacher.get(`/api/classes/${classId}/assignments/${aid}`)).body;
    expect(d.roster.map((r) => [r.student.name, r.status])).toEqual([["S One", "submitted"], ["S Two", "assigned"]]);
    expect((await teacher.post(`/api/classes/${classId}/assignments/${aid}/grade/${s1.user.id}`).send({ grade: 25 })).status).toBe(400);
    const g = await teacher.post(`/api/classes/${classId}/assignments/${aid}/grade/${s1.user.id}`).send({ grade: 18, feedback: "Nice" });
    expect(g.body).toMatchObject({ status: "graded", submission: { grade: 18, feedback: "Nice" } });
    expect((await s1.delete(`/api/classes/${classId}/assignments/${aid}/submission`)).status).toBe(400); // graded → locked
    const list = (await teacher.get(`/api/classes/${classId}/assignments`)).body.assignments.find((a) => a.id === aid);
    expect(list).toMatchObject({ turnedIn: 1, graded: 1, students: 2 });
    const notes = (await s1.get("/api/me/notifications")).body.items;
    expect(notes.some((n) => n.type === "grade" && n.title.includes("18/20"))).toBe(true);
    expect((await s2.post(`/api/classes/${classId}/assignments/${aid}/grade/${s1.user.id}`).send({ grade: 1 })).status).toBe(403);
  });

  it("dashboards summarise work for each role", async () => {
    const st = (await s2.get("/api/me/dashboard")).body;
    expect(st.role).toBe("student");
    expect(st.stats).toMatchObject({ classes: 1, todo: 2, missing: 1 });
    const t = (await teacher.get("/api/me/dashboard")).body;
    expect(t.stats).toMatchObject({ classes: 1, students: 2, assignments: 2, toGrade: 0 });
  });

  it("deleting an assignment removes submissions", async () => {
    expect((await teacher.delete(`/api/classes/${classId}/assignments/${aid}`)).status).toBe(200);
    expect((await s1.get(`/api/classes/${classId}/assignments/${aid}`)).status).toBe(404);
  });
});

describe("attendance", () => {
  it("teacher records a day (upsert) and both roles see percentages", async () => {
    const put = (date, records) => teacher.put(`/api/classes/${classId}/attendance/${date}`).send({ topic: "L1", records });
    expect((await put("2025-13-40", [])).status).toBe(400);
    await put("2025-01-06", [{ student: s1.user.id, status: "present" }, { student: s2.user.id, status: "absent" }]);
    await put("2025-01-08", [{ student: s1.user.id, status: "late" }, { student: s2.user.id, status: "present" }]);
    const again = await put("2025-01-08", [{ student: s1.user.id, status: "excused" }, { student: s2.user.id, status: "present" }]);
    expect(again.body.session.percent).toBe(100);
    const t = (await teacher.get(`/api/classes/${classId}/attendance`)).body;
    expect(t.sessions).toHaveLength(2);
    expect(Object.fromEntries(t.students.map((s) => [s.student.name, s.percent]))).toEqual({ "S One": 100, "S Two": 50 });
    const me = (await s2.get(`/api/classes/${classId}/attendance`)).body;
    expect(me).toMatchObject({ role: "student", percent: 50 });
    expect((await s2.put(`/api/classes/${classId}/attendance/2025-01-09`).send({ records: [] })).status).toBe(403);
  });

  it("deleting the class cleans up everything", async () => {
    expect((await teacher.delete(`/api/classes/${classId}`)).status).toBe(200);
    expect((await s1.get("/api/classes")).body.classes).toHaveLength(0);
  });
});
