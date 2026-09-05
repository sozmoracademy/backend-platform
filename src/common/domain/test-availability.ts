export type TestAvailability = "locked" | "available" | "in_progress" | "passed" | "failed";
/** Причина блокировки — считается на сервере (FRONTEND.md §7). */
export type TestLockedReason = "lesson_not_completed" | "not_published";

export interface AttemptLike {
  status: "in_progress" | "submitted";
  /** ISO datetime. */
  expiresAt: string;
  score: number | null;
  passed: boolean | null;
}

/** Активная (не просроченная, `in_progress`) попытка — porта `activeAttempt` из `store.tsx`. */
export function activeAttemptOf<T extends AttemptLike>(attempts: T[], now: string): T | undefined {
  return attempts.find(
    (a) => a.status === "in_progress" && new Date(a.expiresAt).getTime() > new Date(now).getTime(),
  );
}

/** Лучшая по `score` завершённая попытка — порт `bestAttempt` из `store.tsx`. */
export function bestAttemptOf<T extends AttemptLike>(attempts: T[]): T | null {
  const submitted = attempts.filter((a) => a.status === "submitted");
  if (submitted.length === 0) return null;
  return submitted.reduce((best, a) => ((a.score ?? 0) > (best.score ?? 0) ? a : best));
}

/**
 * Порт `testAvailability` из `store.tsx` (BACKEND.md §6, ТЗ инвариант 7).
 * `locked`, если тест не `published` или урок не `completed`; иначе `in_progress`,
 * если есть активная попытка; иначе `available`/`passed`/`failed` по лучшей попытке.
 */
export function testAvailability(
  testStatus: "draft" | "published",
  lessonCompleted: boolean,
  attempts: AttemptLike[],
  now: string,
): TestAvailability {
  if (testStatus !== "published" || !lessonCompleted) return "locked";
  if (activeAttemptOf(attempts, now)) return "in_progress";
  const best = bestAttemptOf(attempts);
  if (!best) return "available";
  return best.passed ? "passed" : "failed";
}
