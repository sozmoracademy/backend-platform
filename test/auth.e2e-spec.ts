import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";

describe("auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/login — curator, верные креды → accessToken + refresh cookie", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "curator", password: "test123" })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ role: "curator", curator: { name: expect.any(String) } });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^sozmor_refresh=/);
  });

  it("POST /auth/login — student, верные креды → StudentSelfDto", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "kanat", password: "test123" })
      .expect(201);

    expect(res.body.user).toMatchObject({ role: "student", student: { firstName: "Канат" } });
  });

  it("POST /auth/login — неверный пароль → 401, одинаковое сообщение для несуществующего логина", async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "kanat", password: "wrong" })
      .expect(401);
    const noSuchUser = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "no-such-user", password: "test123" })
      .expect(401);

    expect(wrongPassword.body.message).toBe(noSuchUser.body.message);
  });

  it("GET /auth/me без токена → 401", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("GET /auth/me с access-токеном → профиль текущего пользователя", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "kanat", password: "test123" });
    const res = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({ role: "student", student: { firstName: "Канат" } });
  });

  it("POST /auth/refresh по cookie выдаёт новую пару токенов", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "kanat", password: "test123" });
    const cookie = login.headers["set-cookie"][0];

    const res = await request(app.getHttpServer()).post("/auth/refresh").set("Cookie", cookie).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    // Ротация выдаёт новую refresh-cookie (не обязательно другой access-токен —
    // JWT `iat` в секундах, при быстром прогоне payload может совпасть побитово).
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^sozmor_refresh=/);
  });

  it("POST /auth/refresh без cookie → 401", async () => {
    await request(app.getHttpServer()).post("/auth/refresh").expect(401);
  });

  it("POST /auth/logout инвалидирует refresh-cookie (tokenVersion++)", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "alina", password: "test123" });
    const cookie = login.headers["set-cookie"][0];

    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .set("Cookie", cookie)
      .expect(204);

    // Старый refresh больше не годится — tokenVersion уже увеличен.
    await request(app.getHttpServer()).post("/auth/refresh").set("Cookie", cookie).expect(401);
  });

  it("после logout старый access-токен тоже отклоняется (ver сверяется на каждый запрос)", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ login: "aibek", password: "test123" });
    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(401);
  });
});
