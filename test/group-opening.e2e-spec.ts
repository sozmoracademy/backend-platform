import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp } from "./utils/create-test-app";
import { loginAs } from "./utils/login";
import { PrismaService } from "../src/infra/prisma/prisma.service";

/**
 * Инвариант потабличного открытия уроков по группе (BACKEND.md §7.1, TЗ инвариант 3):
 * открыл N → у активных учеников группы с openedUpTo < N становится N, у кого уже
 * >= N — не трогается; закрыл N → у кого >= N становится N-1. Всё в одной транзакции.
 *
 * Фикстуры — отдельная группа и ученики, созданные только для этого файла: e2e-файлы
 * делят одну БД (BACKEND.md §11), и мутация состояния сид-аккаунтов (kanat/alina/…),
 * от которых зависят другие *.e2e-spec.ts, сделала бы прогон недетерминированным.
 */
describe("group-opening invariant (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let curatorToken: string;
  let groupId: string;
  let aheadId: string;
  let disabledId: string;
  let normalId: string;

  async function makeStudent(login: string, openedUpTo: number, status: "active" | "disabled") {
    const user = await prisma.user.create({ data: { login, passwordHash: "x", role: "STUDENT" } });
    const student = await prisma.student.create({
      data: {
        user: { connect: { id: user.id } },
        firstName: login,
        lastName: "E2E",
        language: "en",
        type: "GROUP",
        startDate: new Date("2026-08-18T00:00:00.000Z"),
        endDate: new Date("2027-02-18T00:00:00.000Z"),
        lastActivity: new Date("2026-08-18T00:00:00.000Z"),
        status,
        openedUpTo,
        group: { connect: { id: groupId } },
      },
    });
    return student.id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    curatorToken = await loginAs(app, "curator");

    const group = await prisma.group.create({
      data: {
        code: `E2E-${Date.now()}`,
        name: "e2e fixture group",
        language: "en",
        startDate: new Date("2026-08-18T00:00:00.000Z"),
        endDate: new Date("2027-02-18T00:00:00.000Z"),
        practiceStart: "20:00",
        practiceEnd: "21:00",
        status: "active",
        currentLesson: 1,
      },
    });
    groupId = group.id;

    normalId = await makeStudent(`e2e-normal-${Date.now()}`, 2, "active");
    aheadId = await makeStudent(`e2e-ahead-${Date.now()}`, 10, "active"); // уже дальше N — не должен откатиться
    disabledId = await makeStudent(`e2e-disabled-${Date.now()}`, 2, "disabled"); // неактивный — не должен открыться
  });

  afterAll(async () => {
    await app.close();
  });

  it("publish-lesson: активные с openedUpTo < N поднимаются до N, у кого уже >= N — не трогается, неактивные не трогаются", async () => {
    const res = await request(app.getHttpServer())
      .post(`/groups/${groupId}/publish-lesson`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ order: 5 })
      .expect(201);
    expect(res.body.lessonOrder).toBe(5);

    const normal = await prisma.student.findUniqueOrThrow({ where: { id: normalId } });
    const ahead = await prisma.student.findUniqueOrThrow({ where: { id: aheadId } });
    const disabled = await prisma.student.findUniqueOrThrow({ where: { id: disabledId } });
    expect(normal.openedUpTo).toBe(5);
    expect(ahead.openedUpTo).toBe(10);
    expect(disabled.openedUpTo).toBe(2);

    const groupAfter = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    expect(groupAfter.currentLesson).toBe(5);
  });

  it("unpublish-lesson: у кого openedUpTo >= N становится N-1 (включая неактивных)", async () => {
    await request(app.getHttpServer())
      .post(`/groups/${groupId}/unpublish-lesson`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ order: 5 })
      .expect(201);

    const normal = await prisma.student.findUniqueOrThrow({ where: { id: normalId } });
    const ahead = await prisma.student.findUniqueOrThrow({ where: { id: aheadId } });
    expect(normal.openedUpTo).toBe(4);
    expect(ahead.openedUpTo).toBe(4);

    const groupAfter = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    expect(groupAfter.currentLesson).toBe(4);
  });

  it("student получает 403 на управление открытием уроков группы", async () => {
    const studentToken = await loginAs(app, "kanat");
    await request(app.getHttpServer())
      .post(`/groups/${groupId}/publish-lesson`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ order: 2 })
      .expect(403);
  });

  it("некорректный номер урока — 400", async () => {
    await request(app.getHttpServer())
      .post(`/groups/${groupId}/publish-lesson`)
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ order: 999 })
      .expect(400);
  });

  it("несуществующая группа — 404", async () => {
    await request(app.getHttpServer())
      .post("/groups/does-not-exist/publish-lesson")
      .set("Authorization", `Bearer ${curatorToken}`)
      .send({ order: 2 })
      .expect(404);
  });
});
