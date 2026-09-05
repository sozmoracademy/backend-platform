import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

describe("lessons editor (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /lessons/:order — статистика (opened/inProgress/completed)", async () => {
    const res = await request(app.getHttpServer())
      .get("/lessons/1")
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.stats.completed).toBeGreaterThan(0);
    expect(res.body.stats.opened).toBeGreaterThanOrEqual(res.body.stats.completed);
  });

  it("PATCH /lessons/:order — обновляет текст урока", async () => {
    const res = await request(app.getHttpServer())
      .patch("/lessons/10")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "Обновлённое название", description: "Новое описание" })
      .expect(200);
    expect(res.body.title).toBe("Обновлённое название");
    expect(res.body.description).toBe("Новое описание");
  });

  it("PATCH /lessons/:order — пустой title отклоняется", async () => {
    await request(app.getHttpServer())
      .patch("/lessons/10")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "" })
      .expect(400);
  });

  it("student → 403 на GET /lessons/:order (редактор куратора)", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer()).get("/lessons/1").set("Authorization", `Bearer ${token}`).expect(403);
  });

  it("оба должны видеть каталог /lessons", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get("/lessons")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(54);
  });
});
