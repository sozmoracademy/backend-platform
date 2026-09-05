export type CefrLevel = "A1" | "A2" | "B1" | "B2";

export interface LevelPlanEntry {
  month: number;
  level: CefrLevel;
}

/**
 * Порт `monthOfLesson`/`levelForLesson` из `store.tsx` (TЗ §4.2, BACKEND.md §6).
 * `month = ceil(order / lessonsPerMonth)`, зажат в `[1, monthsTotal]`.
 */
export function monthOfLesson(order: number, lessonCount = 54, monthsTotal = 6): number {
  const lessonsPerMonth = Math.ceil(lessonCount / monthsTotal);
  return Math.min(monthsTotal, Math.max(1, Math.ceil(order / lessonsPerMonth)));
}

export function levelForLesson(levelPlan: LevelPlanEntry[], order: number, lessonCount = 54, monthsTotal = 6): CefrLevel {
  const month = monthOfLesson(order, lessonCount, monthsTotal);
  return levelPlan.find((p) => p.month === month)?.level ?? "A1";
}
