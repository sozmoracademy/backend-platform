import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

describe("student-cabinet (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /me/dashboard — форма ответа для группового ученика (kanat)", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      firstName: "Канат",
      courseType: "GROUP",
      learningLanguage: "en",
      access: { status: "active" },
    });
    expect(res.body.week).toHaveLength(7);
    expect(["lesson", "test", "practice", "done"]).toContain(res.body.nextStep.kind);
    expect(res.body.progress.lessonsTotal).toBe(54);
  });

  it("GET /me/course — блоки со статусами", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/course")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.total).toBe(54);
    expect(res.body.blocks).toHaveLength(6);
  });

  it("GET /me/lessons — 54 урока, состояние согласовано с openedUpTo/completed", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/lessons")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(54);
    const byOrder = (o: number) => res.body.find((l: { order: number }) => l.order === o);
    expect(byOrder(1).state).toBe("completed");
    expect(byOrder(1).test).toBeDefined();
    // kanat завершил 1,2 и сдал тест урока 1 -> фронтир = урок 3; урок 4 закрыт до завершения 3
    expect(byOrder(3).state).toBe("available");
    expect(byOrder(4).state).toBe("locked");
    expect(byOrder(54).state).toBe("locked");
  });

  it("тест-гейт: непройденный тест урока 1 закрывает следующий урок у alina", async () => {
    const token = await loginAs(app, "alina");
    const lessons = await request(app.getHttpServer())
      .get("/me/lessons")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const byOrder = (o: number) => lessons.body.find((l: { order: number }) => l.order === o);
    // alina завершила уроки 1–3, но тест урока 1 не сдан -> урок 4 закрыт
    expect(byOrder(3).state).toBe("completed");
    expect(byOrder(4).state).toBe("locked");

    // прямой watch по закрытому гейтом уроку отклоняется
    await request(app.getHttpServer())
      .post("/me/lessons/4/watch")
      .set("Authorization", `Bearer ${token}`)
      .send({ pct: 95 })
      .expect(403);
  });

  it("GET /me/lessons/:order — 404 для несуществующего урока", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .get("/me/lessons/999")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("GET /me/lessons/:order локальный урок не отдаёт videoUrl", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/lessons/54")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.state).toBe("locked");
    expect(res.body.videoUrl).toBe("");
  });

  it("POST /me/lessons/:order/watch — 403, если урок ещё закрыт", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .post("/me/lessons/54/watch")
      .set("Authorization", `Bearer ${token}`)
      .send({ pct: 50 })
      .expect(403);
  });

  it("POST /me/lessons/:order/watch — авто-завершение на ≥90%", async () => {
    const token = await loginAs(app, "student12");
    const lessons = await request(app.getHttpServer())
      .get("/me/lessons")
      .set("Authorization", `Bearer ${token}`);
    const available = lessons.body.find((l: { state: string }) => l.state === "available");
    expect(available).toBeDefined();

    const res = await request(app.getHttpServer())
      .post(`/me/lessons/${available.order}/watch`)
      .set("Authorization", `Bearer ${token}`)
      .send({ pct: 95 })
      .expect(201);

    expect(res.body).toEqual({ watchedPct: 100, state: "completed", completedJustNow: true });

    const detail = await request(app.getHttpServer())
      .get(`/me/lessons/${available.order}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(detail.body.state).toBe("completed");
    expect(detail.body.watchedPct).toBe(100);
  });

  it("POST /me/lessons/:order/watch — прогресс без завершения ниже порога", async () => {
    const token = await loginAs(app, "student13");
    const lessons = await request(app.getHttpServer())
      .get("/me/lessons")
      .set("Authorization", `Bearer ${token}`);
    const available = lessons.body.find((l: { state: string }) => l.state === "available");
    expect(available).toBeDefined();

    const res = await request(app.getHttpServer())
      .post(`/me/lessons/${available.order}/watch`)
      .set("Authorization", `Bearer ${token}`)
      .send({ pct: 40 })
      .expect(201);

    expect(res.body).toEqual({ watchedPct: 40, state: "available", completedJustNow: false });
  });

  it("POST /me/lessons/:order/watch — 403 при неактивном доступе (disabled)", async () => {
    const token = await loginAs(app, "elmira");
    await request(app.getHttpServer())
      .post("/me/lessons/1/watch")
      .set("Authorization", `Bearer ${token}`)
      .send({ pct: 95 })
      .expect(403);
  });

  it("чтение (/me/dashboard) остаётся доступным при неактивном доступе (expired)", async () => {
    const token = await loginAs(app, "nurai");
    const res = await request(app.getHttpServer())
      .get("/me/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.access.status).toBe("expired");
  });

  it("GET /me/schedule — 7 дней недели", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/schedule")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(7);
  });

  it("GET /me/profile — логин и счётчики", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ login: "kanat", lessonsTotal: 54 });
  });

  it("curator получает 403 на /me/*", async () => {
    const token = await loginAs(app, "curator");
    await request(app.getHttpServer())
      .get("/me/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("без токена — 401 на /me/*", async () => {
    await request(app.getHttpServer()).get("/me/dashboard").expect(401);
  });
});
