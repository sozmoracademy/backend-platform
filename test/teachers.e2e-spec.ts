import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";

describe("teachers (e2e)", () => {
  let app: INestApplication;
  let curatorToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    curatorToken = await loginAs(app, "curator");
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /teachers — сводка по статусам и список", async () => {
    const res = await request(app.getHttpServer())
      .get("/teachers")
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.summary.active).toBeGreaterThan(0);
    expect(res.body.items.length).toBe(6);
  });

  it("POST /teachers — создаёт преподавателя со статусом active", async () => {
    const res = await request(app.getHttpServer())
      .post("/teachers")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ name: "Новый Преподаватель", phone: "+996700000000", languages: ["en"] })
      .expect(201);
    expect(res.body.status).toBe("active");
    expect(res.body.groupsCount).toBe(0);
  });

  it("GET /teachers/:id — карточка с группами и individual-учениками", async () => {
    const list = await request(app.getHttpServer())
      .get("/teachers")
      .set("Authorization", `Bearer ${curatorToken}`);
    const t1 = list.body.items.find((t: { id: string }) => t.id === "t1");
    const res = await request(app.getHttpServer())
      .get(`/teachers/${t1.id}`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .expect(200);
    expect(res.body.groups.length).toBeGreaterThan(0);
    expect(res.body.stats.groupsCount).toBe(res.body.groups.length);
  });

  it("PATCH /teachers/:id — меняет статус", async () => {
    const res = await request(app.getHttpServer())
      .patch("/teachers/t5")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ status: "active" })
      .expect(200);
    expect(res.body.status).toBe("active");
  });

  it("student → 403 на /teachers", async () => {
    const token = await loginAs(app, "kanat");
    await request(app.getHttpServer()).get("/teachers").set("Authorization", `Bearer ${token}`).expect(403);
  });
});
