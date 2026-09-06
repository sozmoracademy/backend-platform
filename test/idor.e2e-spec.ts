import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

/**
 * IDOR (TЗ инвариант 1, BACKEND.md §5.3): student не получает данные другой роли/
 * другого ученика ни через `/students`, ни подменой чужого id ресурса кабинета.
 */
describe("IDOR (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("student → 403 на GET /students (список — только curator)", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer()).get("/students").set("Authorization", `Bearer ${token}`).expect(403);
  });

  it("student → 403 на GET /students/:id чужой карточки", async () => {
    const token = await loginAs(app, "kanat");
    const curatorToken = await loginAs(app, "curator");
    const other = await request(app.getHttpServer())
      .get("/students")
      .set("Authorization", `Bearer ${curatorToken}`);
    const otherId = other.body.items[0].id;
    await request(app.getHttpServer())
      .get(`/students/${otherId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("student → 403 на POST /groups (curator-only)", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .post("/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({
        language: "en",
        durationMonths: 6,
        startDate: "2026-10-01",
        practiceStart: "20:00",
        practiceEnd: "21:00",
        teacherId: null,
        maxStudents: 30,
      })
      .expect(403);
  });

  it("student → 403 на GET /curator/dashboard", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .get("/curator/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("чужая попытка теста — 403, не 404 (не подтверждает и не опровергает существование)", async () => {
    // Не kanat: другие e2e-файлы (tests.e2e-spec.ts) рассчитывают на «чистое» состояние
    // его теста урока 1 — общая тестовая БД, см. BACKEND.md §11.
    const owner = await loginAs(app, "alina");
    const stranger = await loginAs(app, "aibek");
    const start = await request(app.getHttpServer())
      .post("/me/tests/1/attempts")
      .set("Authorization", `Bearer ${owner}`);
    if (start.status === 201) {
      await request(app.getHttpServer())
        .get(`/me/attempts/${start.body.id}`)
        .set("Authorization", `Bearer ${stranger}`)
        .expect(403);
    }
  });

  it("/me/* игнорирует любой чужой id в пути — studentId всегда из токена", async () => {
    const token = await loginAs(app, "kanat");
    // /me/* не принимает :studentId вовсе — маршрутов с чужим id не существует.
    // Проверяем, что данные в ответе всегда соответствуют владельцу токена.
    const res = await request(app.getHttpServer())
      .get("/me/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.login).toBe("kanat");
  });
});
