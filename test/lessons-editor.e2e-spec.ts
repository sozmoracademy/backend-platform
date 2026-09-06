import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/infra/prisma/prisma.service";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

const EN_GROUP_6MO = "en-group-6mo";

describe("lessons editor (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    // Уроки, созданные тестами POST, убираем — другие спеки (student-cabinet,
    // tests-editor) рассчитывают на 54 урока en-group-6mo из сида.
    await app
      .get(PrismaService)
      .lesson.deleteMany({ where: { courseProductId: EN_GROUP_6MO, order: { gt: 54 } } });
    await app.close();
  });

  it("GET /courses/products/:productId/lessons/:order — статистика (opened/inProgress/completed)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/courses/products/${EN_GROUP_6MO}/lessons/1`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.stats.completed).toBeGreaterThan(0);
    expect(res.body.stats.opened).toBeGreaterThanOrEqual(res.body.stats.completed);
  });

  it("PATCH /courses/products/:productId/lessons/:order — обновляет текст урока", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/courses/products/${EN_GROUP_6MO}/lessons/10`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "Обновлённое название", description: "Новое описание" })
      .expect(200);
    expect(res.body.title).toBe("Обновлённое название");
    expect(res.body.description).toBe("Новое описание");
  });

  it("PATCH /courses/products/:productId/lessons/:order — пустой title отклоняется", async () => {
    await request(app.getHttpServer())
      .patch(`/courses/products/${EN_GROUP_6MO}/lessons/10`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "" })
      .expect(400);
  });

  it("student → 403 на GET /courses/products/:productId/lessons/:order (редактор куратора)", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .get(`/courses/products/${EN_GROUP_6MO}/lessons/1`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("оба должны видеть каталог /courses/products/:productId/lessons", async () => {
    const token = await loginAs(app, "kanat");
    const res = await request(app.getHttpServer())
      .get(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(54);
  });

  it("POST /courses/products/:productId/lessons — добавляет урок в конец (order = max + 1)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "Новый урок куратора", block: "Speaking", description: "Проба" })
      .expect(201);
    expect(res.body.order).toBe(55);
    expect(res.body.block).toBe("Speaking");
    expect(res.body.duration).toBe("00:00");
    expect(res.body.stats).toEqual({ opened: 0, inProgress: 0, completed: 0 });

    const catalog = await request(app.getHttpServer())
      .get(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(catalog.body).toHaveLength(55);
    expect(catalog.body.at(-1)).toMatchObject({ order: 55, title: "Новый урок куратора" });
  });

  it("POST /courses/products/:productId/lessons — пустой title/block отклоняется (400)", async () => {
    await request(app.getHttpServer())
      .post(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "", block: "Speaking" })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "Тема", block: "" })
      .expect(400);
  });

  it("POST /courses/products/:productId/lessons — 404 для неизвестного продукта", async () => {
    await request(app.getHttpServer())
      .post(`/courses/products/no-such-product/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ title: "Тема", block: "Intensive" })
      .expect(404);
  });

  it("POST /courses/products/:productId/lessons — student → 403", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .post(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Тема", block: "Speaking" })
      .expect(403);
  });
});
