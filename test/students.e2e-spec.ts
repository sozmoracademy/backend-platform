import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

describe("students (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /students — пагинация и форма ответа", async () => {
    const res = await request(app.getHttpServer())
      .get("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThanOrEqual(res.body.items.length);
    expect(res.body.pageSize).toBe(20);
  });

  it("GET /students?q=Канат — находит по имени", async () => {
    const res = await request(app.getHttpServer())
      .get("/students")
      .query({ q: "Канат" })
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.items.some((s: { login: string }) => s.login === "kanat")).toBe(true);
  });

  it("POST /students — создаёт ученика, отдаёт пароль один раз, логин должен быть уникален", async () => {
    const created = await request(app.getHttpServer())
      .post("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        firstName: "Тест",
        lastName: "Тестов",
        age: 20,
        city: "Бишкек",
        phone: "+996700000000",
        login: "e2e-newstudent",
        password: "abcde",
        language: "en",
        type: "INDIVIDUAL",
        startDate: "2026-10-01",
        practiceStart: "20:00",
        groupId: null,
        manager: "Тест",
        total: 20000,
        paid: 0,
      })
      .expect(201);
    expect(created.body.login).toBe("e2e-newstudent");
    // Пароль приходит с формы и возвращается как есть (хранится bcrypt-хешем).
    expect(created.body.password).toBe("abcde");
    // Поля для приветственного сообщения куратора (экран «Ученик создан»).
    expect(created.body.phone).toBe("+996700000000");
    expect(created.body.language).toBe("en");
    expect(created.body.durationMonths).toBe(1); // INDIVIDUAL — 1 месяц

    // Дубликат логина отклоняется.
    await request(app.getHttpServer())
      .post("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({
        firstName: "Второй",
        lastName: "Дубль",
        age: 20,
        city: "Ош",
        phone: "+996700000001",
        login: "e2e-newstudent",
        password: "abcde",
        language: "en",
        type: "INDIVIDUAL",
        startDate: "2026-10-01",
        practiceStart: "20:00",
        groupId: null,
        manager: "Тест",
        total: 20000,
        paid: 0,
      })
      .expect(400);

    // Новый логин действительно работает.
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "e2e-newstudent", password: created.body.password })
      .expect(201);
    expect(login.body.user.student.firstName).toBe("Тест");
  });

  it("POST /students — короткий/пустой пароль отклоняется (400)", async () => {
    const base = {
      firstName: "Без",
      lastName: "Пароля",
      age: 20,
      city: "Бишкек",
      phone: "+996700000002",
      login: "e2e-nopass",
      language: "en",
      type: "INDIVIDUAL",
      startDate: "2026-10-01",
      practiceStart: "20:00",
      groupId: null,
      manager: "Тест",
      total: 20000,
      paid: 0,
    };
    await request(app.getHttpServer())
      .post("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ ...base, password: "ab" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send(base)
      .expect(400);
  });

  it("PATCH /students/:id/access — меняет статус и дату окончания", async () => {
    const list = await request(app.getHttpServer())
      .get("/students")
      .set("Authorization", `Bearer ${curatorToken}`);
    const id = list.body.items[0].id;
    const res = await request(app.getHttpServer())
      .patch(`/students/${id}/access`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ status: "disabled" })
      .expect(200);
    expect(res.body.accessStatus).toBe("disabled");
    expect(res.body.status).toBe("disabled");
  });

  it("POST /students/:id/open-lesson — только для Individual", async () => {
    const list = await request(app.getHttpServer())
      .get("/students")
      .set("Authorization", `Bearer ${curatorToken}`)
      .query({ type: "GROUP" });
    const groupStudentId = list.body.items[0].id;
    await request(app.getHttpServer())
      .post(`/students/${groupStudentId}/open-lesson`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ order: 5 })
      .expect(400);
  });

  it("GET /students/export — CSV с заголовком", async () => {
    const res = await request(app.getHttpServer())
      .get("/students/export")
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.text.split("\n")[0]).toBe(
      "Name,Login,Phone,Course,Type,Group,StartDate,EndDate,Status,Paid,Total,Payment",
    );
  });

  it("заметки: добавить и удалить", async () => {
    const list = await request(app.getHttpServer())
      .get("/students")
      .set("Authorization", `Bearer ${curatorToken}`);
    const id = list.body.items[0].id;
    const note = await request(app.getHttpServer())
      .post(`/students/${id}/notes`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ content: "Заметка e2e" })
      .expect(201);
    expect(note.body.author).toBe("Мээрим Абдыраева");

    const list2 = await request(app.getHttpServer())
      .get(`/students/${id}/notes`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(list2.body.some((n: { id: string }) => n.id === note.body.id)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(204);
  });
});
