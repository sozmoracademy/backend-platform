import { levelForLesson, monthOfLesson, type CefrLevel, type LevelPlanEntry } from "./program";

export type WeekRhythmKind = "theory" | "practice" | "rest";
export const WEEK_RHYTHM: readonly WeekRhythmKind[] = [
  "theory",
  "practice",
  "theory",
  "practice",
  "theory",
  "practice",
  "rest",
];

export interface ConflictGroup {
  id: string;
  teacherId: string | null;
  practiceStart: string;
  status: "recruiting" | "active" | "finished" | "archived";
}

/**
 * Конфликт вечернего слота преподавателя (TЗ инвариант 12, BACKEND.md §7.4):
 * нельзя назначить преподавателя в две группы `active|recruiting` с тем же `practiceStart`.
 */
export function teacherGroupConflict<T extends ConflictGroup>(
  groups: T[],
  teacherId: string,
  practiceStart: string,
  exceptGroupId?: string,
): T | undefined {
  return groups.find(
    (g) =>
      g.id !== exceptGroupId &&
      g.teacherId === teacherId &&
      g.practiceStart === practiceStart &&
      (g.status === "active" || g.status === "recruiting"),
  );
}

export interface MatchGroup {
  id: string;
  language: string;
  status: "recruiting" | "active" | "finished" | "archived";
  startDate: string;
  practiceStart: string;
  studentCount: number;
  maxStudents: number;
}

/** Автоподбор группы для нового Group-ученика (TЗ §5.3, `findMatchingGroup`). */
export function findMatchingGroup<T extends MatchGroup>(
  groups: T[],
  language: string,
  fromDate: string,
  practiceStart?: string,
): T | undefined {
  return groups
    .filter((g) => g.language === language)
    .filter((g) => g.status === "recruiting")
    .filter((g) => g.startDate >= fromDate)
    .filter((g) => !practiceStart || g.practiceStart === practiceStart)
    .filter((g) => g.studentCount < g.maxStudents)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export interface GroupStage {
  month: number;
  level: CefrLevel;
  lesson: number;
}

/** Текущий этап группы (месяц/уровень/урок) — по `group.currentLesson` (BACKEND.md §6). */
export function groupStage(currentLesson: number, levelPlan: LevelPlanEntry[], lessonCount = 54): GroupStage {
  return {
    month: monthOfLesson(currentLesson, lessonCount),
    level: levelForLesson(levelPlan, currentLesson, lessonCount),
    lesson: currentLesson,
  };
}

/** Расписание группы на неделю — ритм теория/практика/выходной наложенный на слот практики. */
export function groupWeekSchedule(
  practiceStart: string,
  practiceEnd: string,
): { day: string; kind: WeekRhythmKind; time: string }[] {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return days.map((day, i) => ({
    day,
    kind: WEEK_RHYTHM[i]!,
    time: WEEK_RHYTHM[i] === "practice" ? `${practiceStart}–${practiceEnd}` : "",
  }));
}
