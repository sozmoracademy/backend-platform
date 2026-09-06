import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

const EN_GROUP_6MO = "en-group-6mo";

describe("tests editor (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;
  let lessonIdByOrder: Map<number, string>;

  async function lessonId(order: number): Promise<string> {
    if (lessonIdByOrder.has(order)) return lessonIdByOrder.get(order)!;
    const res = await request(app.getHttpServer())
      .get(`/courses/products/${EN_GROUP_6MO}/lessons`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    for (const l of res.body as { id: string; order: number }[]) lessonIdByOrder.set(l.order, l.id);
    return lessonIdByOrder.get(order)!;
  }

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
    lessonIdByOrder = new Map();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /tests/lesson/:lessonId — null, если теста нет", async () => {
    const id = await lessonId(7);
    const res = await request(app.getHttpServer())
      .get(`/tests/lesson/${id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body).toBeNull();
  });

  it("POST /tests — повторный вызов для того же урока возвращает существующий тест", async () => {
    const id = await lessonId(8);
    const first = await request(app.getHttpServer())
      .post("/tests")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ lessonId: id })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post("/tests")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ lessonId: id })
      .expect(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it("публикация без вопросов — 400 (TЗ инвариант 10)", async () => {
    const id = await lessonId(9);
    const test = await request(app.getHttpServer())
      .post("/tests")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ lessonId: id });
    await request(app.getHttpServer())
      .patch(`/tests/${test.body.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ status: "published" })
      .expect(400);
  });

  it("вопрос/вариант/публикация/эксклюзивность single-choice/удаление с перенумерацией", async () => {
    const id = await lessonId(11);
    const test = await request(app.getHttpServer())
      .post("/tests")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ lessonId: id });
    const testId = test.body.id;

    const q1 = await request(app.getHttpServer())
      .post(`/tests/${testId}/questions`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(201);
    expect(q1.body.questions).toHaveLength(1);
    expect(q1.body.questions[0].options).toHaveLength(4);
    expect(q1.body.questions[0].options[0].isCorrect).toBe(true);

    const q2 = await request(app.getHttpServer())
      .post(`/tests/${testId}/questions`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(201);
    expect(q2.body.questions).toHaveLength(2);
    expect(q2.body.questions[1].order).toBe(2);

    // Публикация теперь проходит (>= 1 вопрос).
    const published = await request(app.getHttpServer())
      .patch(`/tests/${testId}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ status: "published" })
      .expect(200);
    expect(published.body.status).toBe("published");

    const question = q1.body.questions[0];
    await request(app.getHttpServer())
      .patch(`/questions/${question.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ text: "Вопрос 1", type: "single" })
      .expect(200);

    // Отмечаем второй вариант правильным — для single первый должен автоматически стать неправильным.
    const secondOptionId = question.options[1].id;
    const afterExclusive = await request(app.getHttpServer())
      .patch(`/options/${secondOptionId}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ isCorrect: true })
      .expect(200);
    const q1After = afterExclusive.body.questions.find((q: { id: string }) => q.id === question.id);
    expect(q1After.options.find((o: { id: string }) => o.id === secondOptionId).isCorrect).toBe(true);
    expect(q1After.options.find((o: { id: string }) => o.id === question.options[0].id).isCorrect).toBe(
      false,
    );

    // Удаляем первый вопрос — второй должен перенумероваться в order=1.
    const afterDelete = await request(app.getHttpServer())
      .delete(`/questions/${question.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(afterDelete.body.questions).toHaveLength(1);
    expect(afterDelete.body.questions[0].order).toBe(1);
  });

  it("DELETE /tests/:id — удаляет тест", async () => {
    const id = await lessonId(12);
    const test = await request(app.getHttpServer())
      .post("/tests")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ lessonId: id });
    await request(app.getHttpServer())
      .delete(`/tests/${test.body.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(204);
    const check = await request(app.getHttpServer())
      .get(`/tests/lesson/${id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(check.body).toBeNull();
  });

  it("student → 403 на редактор теста", async () => {
    const token = await loginAs(app, "kanat");
    const id = await lessonId(1);
    await request(app.getHttpServer())
      .get(`/tests/lesson/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });
});
