export type LessonState = "locked" | "available" | "completed";

/**
 * Порт `lessonState`/`progressOf`/`currentLessonOrder` из `store.tsx` (BACKEND.md §6).
 * `completed`, если урок в `completedOrders`; `available`, если `order <= openedUpTo`;
 * иначе `locked`.
 */
export function lessonState(openedUpTo: number, completedOrders: ReadonlySet<number>, order: number): LessonState {
  if (completedOrders.has(order)) return "completed";
  if (order <= openedUpTo) return "available";
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
