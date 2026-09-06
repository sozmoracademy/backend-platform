export type CefrLevel = "A1" | "A2" | "B1" | "B2";

export interface LevelPlanEntry {
  month: number;
  level: CefrLevel;
}

/**
 * Порт `monthOfLesson`/`levelForLesson` из `store.tsx` (TЗ §4.2, BACKEND.md §6).
 * `month = ceil(order / lessonsPerMonth)`, зажат в `[1, monthsTotal]`.
 */
export function monthOfLesson(order: number, lessonCount: number, monthsTotal: number): number {
  const lessonsPerMonth = Math.ceil(lessonCount / monthsTotal);
  return Math.min(monthsTotal, Math.max(1, Math.ceil(order / lessonsPerMonth)));
}

export type StageStatus = "locked" | "current" | "completed";

export interface CourseStage {
  block: string;
  level: CefrLevel;
  month: number;
}

/** Порт `stageStatus` из `store.tsx` — статус блока программы на роадмапе (BACKEND.md §12, `/me/course`). */
export function stageStatus(
  stageLessonOrders: number[],
  openedUpTo: number,
  completedOrders: ReadonlySet<number>,
): StageStatus {
  if (stageLessonOrders.length === 0) return "locked";
  if (stageLessonOrders.every((order) => completedOrders.has(order))) return "completed";
  return stageLessonOrders.some((order) => order <= openedUpTo) ? "current" : "locked";
}

/** Уникальные уровни блоков программы, в порядке появления (BACKEND.md §12). */
export function courseLevels(stages: CourseStage[]): CefrLevel[] {
  return [...new Set(stages.map((s) => s.level))];
}

/** Порт `levelStatus` из `store.tsx` — статус уровня CEFR на роадмапе дашборда ученика. */
export function levelStatus(
  level: CefrLevel,
  stages: CourseStage[],
  statusOfStage: (stage: CourseStage) => StageStatus,
): StageStatus {
  const statuses = stages.filter((s) => s.level === level).map(statusOfStage);
  if (statuses.every((s) => s === "completed")) return "completed";
  if (statuses.some((s) => s === "current" || s === "completed")) return "current";
  return "locked";
}

export function levelForLesson(
  levelPlan: LevelPlanEntry[],
  order: number,
  lessonCount: number,
  monthsTotal: number,
): CefrLevel {
  const month = monthOfLesson(order, lessonCount, monthsTotal);
  return levelPlan.find((p) => p.month === month)?.level ?? "A1";
}
