import { bestAttemptOf, type AttemptLike } from "./test-availability";

export type LessonState = "locked" | "available" | "completed";

/**
 * Множество уроков, чей тест «зачтён»: у урока НЕТ опубликованного теста ЛИБО по
 * его тесту есть попытка с `passed = true` (набран проходной балл). Такой урок не
 * блокирует открытие следующего (реш. владельца, ТЗ инвариант 4).
 */
export function testClearedOrders(
  lessonOrders: Iterable<number>,
  tests: ReadonlyArray<{ lessonOrder: number; status: "draft" | "published" }>,
  attempts: ReadonlyArray<AttemptLike & { lessonOrder: number }>,
): Set<number> {
  const cleared = new Set<number>();
  for (const order of lessonOrders) {
    const test = tests.find((t) => t.lessonOrder === order);
    if (!test || test.status !== "published") {
      cleared.add(order);
      continue;
    }
    if (bestAttemptOf(attempts.filter((a) => a.lessonOrder === order))?.passed) {
      cleared.add(order);
    }
  }
  return cleared;
}

/**
 * Докуда ученик реально «дошёл»: уроки открываются строго по порядку — очередной
 * доступен, только когда предыдущий `completed` И его тест зачтён (`testClearedOrders`).
 * `openedUpTo` (потабличный переключатель группы) — верхняя граница; тест-гейт
 * сужает её для конкретного ученика (ТЗ инвариант 4, реш. владельца).
 */
export function reachableUpTo(
  openedUpTo: number,
  completedOrders: ReadonlySet<number>,
  clearedOrders: ReadonlySet<number>,
): number {
  for (let k = 1; k <= openedUpTo; k++) {
    if (completedOrders.has(k) && clearedOrders.has(k)) continue;
    return k;
  }
  return openedUpTo;
}

/**
 * Порт `lessonState`/`progressOf`/`currentLessonOrder` из `store.tsx` (BACKEND.md §6),
 * плюс тест-гейт (ТЗ инвариант 4). `completed`, если урок в `completedOrders`;
 * `available`, если он в пределах `reachableUpTo`; иначе `locked`.
 */
export function lessonState(
  openedUpTo: number,
  completedOrders: ReadonlySet<number>,
  clearedOrders: ReadonlySet<number>,
  order: number,
): LessonState {
  if (completedOrders.has(order)) return "completed";
  if (order <= reachableUpTo(openedUpTo, completedOrders, clearedOrders)) return "available";
  return "locked";
}

export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** Первый незавершённый среди открытых уроков; если все открытые завершены — последний открытый. */
export function currentLessonOrder(openedUpTo: number, completedOrders: ReadonlySet<number>): number {
  for (let i = 1; i <= openedUpTo; i++) {
    if (!completedOrders.has(i)) return i;
  }
  return openedUpTo;
}
