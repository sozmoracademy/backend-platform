import {
  currentLessonOrder,
  lessonState,
  progressPercent,
  reachableUpTo,
  testClearedOrders,
} from "./lesson-progress";
import type { AttemptLike } from "./test-availability";

const attempt = (over: Partial<AttemptLike & { lessonOrder: number }> = {}) => ({
  lessonOrder: 1,
  status: "submitted" as const,
  expiresAt: "2026-01-01T00:00:00.000Z",
  score: 90,
  passed: true,
  ...over,
});

describe("testClearedOrders", () => {
  it("урок без опубликованного теста — всегда зачтён", () => {
    const cleared = testClearedOrders([1, 2, 3], [{ lessonOrder: 2, status: "draft" }], []);
    expect([...cleared].sort()).toEqual([1, 2, 3]);
  });

  it("опубликованный тест зачтён только при passed-попытке", () => {
    const tests = [
      { lessonOrder: 1, status: "published" as const },
      { lessonOrder: 2, status: "published" as const },
    ];
    const attempts = [
      attempt({ lessonOrder: 1, score: 80, passed: true }),
      attempt({ lessonOrder: 2, score: 40, passed: false }),
    ];
    const cleared = testClearedOrders([1, 2], tests, attempts);
    expect(cleared.has(1)).toBe(true);
    expect(cleared.has(2)).toBe(false);
  });
});

describe("reachableUpTo", () => {
  const allCleared = new Set([1, 2, 3, 4, 5]);

  it("без прогресса доступен только первый урок", () => {
    expect(reachableUpTo(5, new Set(), allCleared)).toBe(1);
  });

  it("сдвигается вперёд по завершённым+зачтённым урокам", () => {
    expect(reachableUpTo(5, new Set([1, 2]), allCleared)).toBe(3);
  });

  it("останавливается на завершённом уроке с незачтённым тестом", () => {
    expect(reachableUpTo(5, new Set([1, 2]), new Set([1, 3, 4, 5]))).toBe(2);
  });

  it("не выходит за openedUpTo", () => {
    expect(reachableUpTo(3, new Set([1, 2, 3, 4, 5]), allCleared)).toBe(3);
  });
});

describe("lessonState", () => {
  const cleared = new Set([1, 2, 3, 4, 5]);

  it("completed, если урок в completedOrders", () => {
    expect(lessonState(4, new Set([1, 2]), cleared, 1)).toBe("completed");
  });

  it("available только для следующего по порядку урока", () => {
    expect(lessonState(4, new Set([1, 2]), cleared, 3)).toBe("available");
    expect(lessonState(4, new Set([1, 2]), cleared, 4)).toBe("locked");
  });

  it("locked, если order > openedUpTo", () => {
    expect(lessonState(4, new Set([1, 2, 3, 4]), cleared, 5)).toBe("locked");
  });

  it("следующий урок закрыт, пока не сдан тест предыдущего", () => {
    // урок 1 завершён, но его тест не зачтён → урок 2 закрыт
    expect(lessonState(4, new Set([1]), new Set([2, 3, 4]), 2)).toBe("locked");
    // тест урока 1 зачли → урок 2 открылся
    expect(lessonState(4, new Set([1]), new Set([1, 2, 3, 4]), 2)).toBe("available");
  });
});

describe("progressPercent", () => {
  it("округляет процент, 0 при total=0", () => {
    expect(progressPercent(27, 54)).toBe(50);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe("currentLessonOrder", () => {
  it("первый незавершённый среди открытых", () => {
    expect(currentLessonOrder(4, new Set([1, 2]))).toBe(3);
  });

  it("если все открытые завершены — последний открытый", () => {
    expect(currentLessonOrder(4, new Set([1, 2, 3, 4]))).toBe(4);
  });
});
