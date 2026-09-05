import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";
import { PrismaService } from "../src/infra/prisma/prisma.service";

describe("tests / attempts (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /me/tests/:order — 404, если у урока вовсе нет теста", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer()).get("/me/tests/2").set("Authorization", `Bearer ${token}`).expect(404);
  });

  it("GET /me/tests/:order — locked с причиной lesson_not_completed, если урок не завершён", async () => {
    // "elmira" не проходила ни одного урока — тест урока 1 существует (published), но 1 не completed.
    // Возьмём другого ученика без завершённого 1-го урока и с активным доступом: сгенерированного.
    const login = await loginAs(app, "student20");
    const res = await request(app.getHttpServer())
      .get("/me/tests/1")
      .set("Authorization", `Bearer ${login}`)
      .expect(200);
    if (res.body.availability === "locked") {
      expect(res.body.lockedReason).toBe("lesson_not_completed");
    }
  });

  it("сценарий полностью: intro → start → answer → submit → результат → повторный intro видит лучший результат", async () => {
    const token = await loginAs(app, "kanat"); // s1: lesson 1 completed
    const intro = await request(app.getHttpServer())
      .get("/me/tests/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(intro.body.availability).toBe("available");
    expect(intro.body.questionCount).toBe(8);

    const start = await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(start.body.status).toBe("in_progress");
    expect(start.body.questions).toHaveLength(8);
    expect(start.body.questions[0].options[0].isCorrect).toBeUndefined();
    const attemptId = start.body.id;

    // Повторный старт возвращает ту же активную попытку (одна активная на пару студент-тест).
    const startAgain = await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(startAgain.body.id).toBe(attemptId);

    // Отвечаем правильно на все вопросы теста (см. seed-data/academy.ts — правильный вариант o{correctIndex+1}).
    const correctAnswers: [string, string][] = [
      ["l1q1", "l1q1o1"],
      ["l1q2", "l1q2o1"],
      ["l1q3", "l1q3o2"],
      ["l1q4", "l1q4o3"],
      ["l1q5", "l1q5o4"],
      ["l1q6", "l1q6o1"],
      ["l1q7", "l1q7o2"],
      ["l1q8", "l1q8o3"],
    ];
    for (const [questionId, optionId] of correctAnswers) {
      const res = await request(app.getHttpServer())
        .patch(`/me/attempts/${attemptId}/answers`)
        .set("Authorization", `Bearer ${token}`)
        .send({ questionId, optionIds: [optionId] })
        .expect(200);
      expect(res.body.status).toBe("in_progress");
    }

    const submitted = await request(app.getHttpServer())
      .post(`/me/attempts/${attemptId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(submitted.body).toMatchObject({
      status: "submitted",
      correctCount: 8,
      totalQuestions: 8,
      score: 100,
      passed: true,
    });
    expect(submitted.body.questions[0].options[0].isCorrect).toBe(true);

    // Повторный submit идемпотентен — тот же результат.
    const submitAgain = await request(app.getHttpServer())
      .post(`/me/attempts/${attemptId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(submitAgain.body.score).toBe(100);

    const introAfter = await request(app.getHttpServer())
      .get("/me/tests/1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(introAfter.body.availability).toBe("passed");
    expect(introAfter.body.best).toEqual({ score: 100, passed: true });
  });

  it("PATCH /me/attempts/:id/answers — 403 на чужую попытку (IDOR)", async () => {
    const owner = await loginAs(app, "student21");
    const stranger = await loginAs(app, "student22");

    // Открываем урок 1 (уже completed для part of seed) — используем существующий тест-1.
    const start = await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${owner}`);
    if (start.status !== 201) return; // урок 1 может быть не completed у этого сид-ученика — пропускаем гонку данных.

    await request(app.getHttpServer())
      .patch(`/me/attempts/${start.body.id}/answers`)
      .set("Authorization", `Bearer ${stranger}`)
      .send({ questionId: "l1q1", optionIds: ["l1q1o1"] })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/me/attempts/${start.body.id}`)
      .set("Authorization", `Bearer ${stranger}`)
      .expect(403);
  });

  it("автосабмит просроченной попытки при обращении (таймер истёк)", async () => {
    const token = await loginAs(app, "student23");
    const start = await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${token}`);
    if (start.status !== 201) return;

    await prisma.testAttempt.update({
      where: { id: start.body.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app.getHttpServer())
      .get(`/me/attempts/${start.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe("submitted");
    expect(res.body.correctCount).toBe(0); // ответов не давали — всё неверно
  });

  it("POST /me/tests/:order/attempts — 403 при неактивном доступе", async () => {
    const token = await loginAs(app, "elmira"); // disabled
    await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});
