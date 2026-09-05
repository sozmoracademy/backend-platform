import { lessonState, progressPercent, currentLessonOrder } from "./lesson-progress";

describe("lessonState", () => {
  const completed = new Set([1, 2]);

  it("completed, если урок в completedOrders", () => {
    expect(lessonState(4, completed, 1)).toBe("completed");
  });

  it("available, если order <= openedUpTo и не completed", () => {
    expect(lessonState(4, completed, 3)).toBe("available");
    expect(lessonState(4, completed, 4)).toBe("available");
  });

  it("locked, если order > openedUpTo", () => {
    expect(lessonState(4, completed, 5)).toBe("locked");
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
