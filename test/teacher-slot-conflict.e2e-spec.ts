import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

/** Конфликт вечернего слота преподавателя (TЗ инвариант 12, BACKEND.md §7.4). */
describe("teacher slot conflict (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    await app.close();
  });

  it("нельзя создать группу с преподавателем, уже занятым в этот слот", async () => {
    // t1 уже ведёт EN-01 (active) в 20:00 (seed-data/academy.ts).
    await request(app.getHttpServer())
      .post("/groups")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        language: "en",
        durationMonths: 6,
        startDate: "2026-11-01",
        practiceStart: "20:00",
        practiceEnd: "21:00",
        teacherId: "t1",
        maxStudents: 30,
      })
      .expect(400);
  });

  it("другой слот у того же преподавателя — можно", async () => {
    const res = await request(app.getHttpServer())
      .post("/groups")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        language: "en",
        durationMonths: 6,
        startDate: "2026-11-01",
        practiceStart: "22:00",
        practiceEnd: "23:00",
        teacherId: "t1",
        maxStudents: 30,
      })
      .expect(201);
    expect(res.body.teacherId).toBe("t1");
  });

  it("PATCH /groups/:id/teacher — конфликт при назначении в занятый слот", async () => {
    const groups = await request(app.getHttpServer())
      .get("/groups")
      .set("Authorization", `Bearer ${curatorToken}`);
    // EN-03 (t2, 20:00, recruiting) — переназначаем на t1, который уже ведёт EN-02 в 20:00.
    const target = groups.body.items.find((g: { code: string }) => g.code === "EN-03");
    expect(target).toBeDefined();
    await request(app.getHttpServer())
      .patch(`/groups/${target.id}/teacher`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ teacherId: "t1" })
      .expect(400);
  });

  it("назначение преподавателя в другой слот обновляет teacherId у учеников группы", async () => {
    const groups = await request(app.getHttpServer())
      .get("/groups")
      .set("Authorization", `Bearer ${curatorToken}`);
    // RU-03 (g-ru-0914): recruiting, teacherId null, слот 21:00 — не конфликтует с t4 (RU-01, 20:00).
    const target = groups.body.items.find((g: { code: string }) => g.code === "RU-03");
    expect(target).toBeDefined();
    const assign = await request(app.getHttpServer())
      .patch(`/groups/${target.id}/teacher`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ teacherId: "t4" })
      .expect(200);
    expect(assign.body.teacherId).toBe("t4");
  });
});
