import { nextStepFor } from "./next-step";

const lessons = [
  { order: 1, title: "Lesson 1", description: "d1", duration: "10:00" },
  { order: 2, title: "Lesson 2", description: "d2", duration: "10:00" },
  { order: 3, title: "Lesson 3", description: "d3", duration: "10:00" },
];
const today = "2026-08-18";

describe("nextStepFor", () => {
  it("kind=lesson, если есть незавершённый открытый урок", () => {
    const step = nextStepFor({
      openedUpTo: 2,
      completedOrders: new Set([1]),
      lessons,
      tests: [],
      attempts: [],
      meetings: [],
      today,
    });
    expect(step).toEqual({ kind: "lesson", lesson: lessons[1] });
  });

  it("kind=test: непройденный тест завершённого урока важнее следующего урока (тест-гейт)", () => {
    // урок 1 завершён, тест 1 не сдан, урок 2 открыт группой и не завершён —
    // следующий шаг = тест 1, а не «иди на урок 2» (он всё равно закрыт гейтом).
    const step = nextStepFor({
      openedUpTo: 2,
      completedOrders: new Set([1]),
      lessons,
      tests: [{ lessonOrder: 1, status: "published", questionCount: 5, timeLimitSec: 300 }],
      attempts: [],
      meetings: [],
      today,
    });
    expect(step).toMatchObject({ kind: "test", lesson: lessons[0] });
  });

  it("kind=lesson: сданный тест не блокирует переход к следующему уроку", () => {
    const step = nextStepFor({
      openedUpTo: 2,
      completedOrders: new Set([1]),
      lessons,
      tests: [{ lessonOrder: 1, status: "published", questionCount: 5, timeLimitSec: 300 }],
      attempts: [{ lessonOrder: 1, status: "submitted", expiresAt: today, score: 90, passed: true }],
      meetings: [],
      today,
    });
    expect(step).toEqual({ kind: "lesson", lesson: lessons[1] });
  });

  it("kind=test, если урок завершён и тест published доступен", () => {
    const step = nextStepFor({
      openedUpTo: 1,
      completedOrders: new Set([1]),
      lessons,
      tests: [{ lessonOrder: 1, status: "published", questionCount: 5, timeLimitSec: 300 }],
      attempts: [],
      meetings: [],
      today,
    });
    expect(step.kind).toBe("test");
  });

  it("kind=practice, если сегодня запланирована практика", () => {
    const step = nextStepFor({
      openedUpTo: 1,
      completedOrders: new Set([1]),
      lessons,
      tests: [{ lessonOrder: 1, status: "published", questionCount: 5, timeLimitSec: 300 }],
      attempts: [{ lessonOrder: 1, status: "submitted", expiresAt: today, score: 90, passed: true }],
      meetings: [{ id: "m1", date: today, startTime: "20:00", status: "scheduled" }],
      today,
    });
    expect(step).toEqual({
      kind: "practice",
      meeting: { id: "m1", date: today, startTime: "20:00", status: "scheduled" },
    });
  });

  it("kind=done с ближайшей практикой, если сегодня активностей нет", () => {
    const step = nextStepFor({
      openedUpTo: 1,
      completedOrders: new Set([1]),
      lessons,
      tests: [{ lessonOrder: 1, status: "published", questionCount: 5, timeLimitSec: 300 }],
      attempts: [{ lessonOrder: 1, status: "submitted", expiresAt: today, score: 90, passed: true }],
      meetings: [{ id: "m2", date: "2026-08-20", startTime: "20:00", status: "scheduled" }],
      today,
    });
    expect(step).toEqual({
      kind: "done",
      nextMeeting: { id: "m2", date: "2026-08-20", startTime: "20:00", status: "scheduled" },
    });
  });

  it("kind=done без практик вовсе", () => {
    const step = nextStepFor({
      openedUpTo: 1,
      completedOrders: new Set([1]),
      lessons,
      tests: [],
      attempts: [],
      meetings: [],
      today,
    });
    expect(step).toEqual({ kind: "done" });
  });
});
