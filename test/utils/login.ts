import type { INestApplication } from "@nestjs/common";
import request from "supertest";

export async function loginAs(app: INestApplication, login: string, password = "test123"): Promise<string> {
  const res = await request(app.getHttpServer()).post("/auth/login").send({ login, password }).expect(201);
  return res.body.accessToken as string;
}
