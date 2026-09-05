import { testAvailability, activeAttemptOf, bestAttemptOf } from "./test-availability";

const NOW = "2026-08-18T12:00:00.000Z";

describe("testAvailability", () => {
  it("locked, если тест не published", () => {
    expect(testAvailability("draft", true, [], NOW)).toBe("locked");
  });

  it("locked, если урок не completed", () => {
    expect(testAvailability("published", false, [], NOW)).toBe("locked");
  });

  it("available, если published + completed и нет попыток", () => {
    expect(testAvailability("published", true, [], NOW)).toBe("available");
  });

  it("in_progress, если есть активная (не просроченная) попытка", () => {
    const attempts = [
      { status: "in_progress" as const, expiresAt: "2026-08-18T13:00:00.000Z", score: null, passed: null },
    ];
    expect(testAvailability("published", true, attempts, NOW)).toBe("in_progress");
  });

  it("просроченная in_progress попытка не считается активной", () => {
    const attempts = [
      { status: "in_progress" as const, expiresAt: "2026-08-18T11:00:00.000Z", score: null, passed: null },
    ];
    expect(testAvailability("published", true, attempts, NOW)).toBe("available");
  });

  it("passed/failed — по лучшей завершённой попытке", () => {
    const passedAttempts = [{ status: "submitted" as const, expiresAt: NOW, score: 80, passed: true }];
    const failedAttempts = [{ status: "submitted" as const, expiresAt: NOW, score: 40, passed: false }];
    expect(testAvailability("published", true, passedAttempts, NOW)).toBe("passed");
    expect(testAvailability("published", true, failedAttempts, NOW)).toBe("failed");
  });

  it("bestAttemptOf выбирает попытку с наивысшим score", () => {
    const attempts = [
      { status: "submitted" as const, expiresAt: NOW, score: 40, passed: false },
      { status: "submitted" as const, expiresAt: NOW, score: 90, passed: true },
    ];
    expect(bestAttemptOf(attempts)?.score).toBe(90);
  });

  it("activeAttemptOf игнорирует submitted попытки", () => {
    const attempts = [
      { status: "submitted" as const, expiresAt: "2026-08-18T13:00:00.000Z", score: 80, passed: true },
    ];
    expect(activeAttemptOf(attempts, NOW)).toBeUndefined();
  });
});
