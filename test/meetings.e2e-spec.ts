import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";
import { PrismaService } from "../src/infra/prisma/prisma.service";

describe("meetings (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /meetings?range=week — форма ответа", async () => {
    const res = await request(app.getHttpServer())
      .get("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .query({ range: "week" })
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /meetings (GROUP) — без ссылки в группе и в форме → 400", async () => {
    const group = await prisma.group.findFirstOrThrow({ where: { meetUrl: "" } });
    await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ scope: "GROUP", groupId: group.id, date: "2026-12-01" })
      .expect(400);
  });

  it("POST /meetings (GROUP) — время берётся из группы, заголовок авто", async () => {
    const group = await prisma.group.findFirstOrThrow({ where: { code: "EN-02" } });
    const res = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ scope: "GROUP", groupId: group.id, date: "2026-12-01" })
      .expect(201);
    expect(res.body.startTime).toBe(group.practiceStart);
    expect(res.body.title).toMatch(/^Практика:/);
    expect(res.body.roster.length).toBeGreaterThan(0);
  });

  it("POST /groups/:id/meetings — узкая форма: scope GROUP, время из группы", async () => {
    const group = await prisma.group.findFirstOrThrow({ where: { code: "EN-02" } });
    const res = await request(app.getHttpServer())
      .post(`/groups/${group.id}/meetings`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ date: "2026-12-04", meetUrl: "https://meet.google.com/grp" })
      .expect(201);
    expect(res.body.scope).toBe("GROUP");
    expect(res.body.groupId).toBe(group.id);
    expect(res.body.startTime).toBe(group.practiceStart);
    expect(res.body.meetUrl).toBe("https://meet.google.com/grp");
    expect(res.body.roster.length).toBeGreaterThan(0);
  });

  it("POST /groups/:id/meetings — без ссылки в группе и в теле → 400", async () => {
    const group = await prisma.group.findFirstOrThrow({ where: { meetUrl: "" } });
    await request(app.getHttpServer())
      .post(`/groups/${group.id}/meetings`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ date: "2026-12-04" })
      .expect(400);
  });

  it("PATCH /meetings/:id — смена статуса на completed", async () => {
    const created = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        scope: "GROUP",
        groupId: (await prisma.group.findFirstOrThrow({ where: { code: "EN-02" } })).id,
        date: "2026-12-02",
      });
    const res = await request(app.getHttpServer())
      .patch(`/meetings/${created.body.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ status: "completed" })
      .expect(200);
    expect(res.body.status).toBe("completed");
  });

  it("PATCH /meetings/:id/attendance — отмечает и снимает посещение", async () => {
    const group = await prisma.group.findFirstOrThrow({ where: { code: "EN-02" } });
    const student = await prisma.student.findFirstOrThrow({ where: { groupId: group.id } });
    const created = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ scope: "GROUP", groupId: group.id, date: "2026-12-03" });

    const marked = await request(app.getHttpServer())
      .patch(`/meetings/${created.body.id}/attendance`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ studentId: student.id, present: true })
      .expect(200);
    expect(marked.body.roster.find((r: { id: string }) => r.id === student.id).present).toBe(true);

    const unmarked = await request(app.getHttpServer())
      .patch(`/meetings/${created.body.id}/attendance`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ studentId: student.id, present: false })
      .expect(200);
    expect(unmarked.body.roster.find((r: { id: string }) => r.id === student.id).present).toBe(false);
  });

  it("POST /meetings (INDIVIDUAL) — требует время и ссылку", async () => {
    const student = await prisma.student.findFirstOrThrow({ where: { type: "INDIVIDUAL" } });
    await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ scope: "INDIVIDUAL", studentId: student.id, date: "2026-12-01" })
      .expect(400);

    const res = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        scope: "INDIVIDUAL",
        studentId: student.id,
        date: "2026-12-01",
        startTime: "18:00",
        endTime: "19:00",
        meetUrl: "https://meet.google.com/xyz",
      })
      .expect(201);
    expect(res.body.scope).toBe("INDIVIDUAL");
    expect(res.body.studentId).toBe(student.id);
  });

  it("student → 403 на /meetings", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer()).get("/meetings").set("Authorization", `Bearer ${token}`).expect(403);
  });
});
