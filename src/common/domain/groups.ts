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
export function groupStage(
  currentLesson: number,
  levelPlan: LevelPlanEntry[],
  lessonCount: number,
  monthsTotal: number,
): GroupStage {
  return {
    month: monthOfLesson(currentLesson, lessonCount, monthsTotal),
    level: levelForLesson(levelPlan, currentLesson, lessonCount, monthsTotal),
    lesson: currentLesson,
  };
}

/** «EN» / «RU» — префикс кода потока (TЗ §8.4). */
export function groupCodePrefix(language: "en" | "ru"): "EN" | "RU" {
  return language === "en" ? "EN" : "RU";
}

/** Следующий свободный код потока для языка: EN-01, EN-02, … (BACKEND.md §12, `POST /groups`). */
export function nextGroupCode(existingCodes: string[], language: "en" | "ru"): string {
  const prefix = groupCodePrefix(language);
  const used = existingCodes
    .filter((c) => c.startsWith(`${prefix}-`))
    .map((c) => Number(c.split("-")[1]) || 0);
  const n = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

function languageNameRu(language: "en" | "ru"): string {
  return language === "en" ? "Английский язык" : "Русский язык";
}

/** «EN-02 · Английский язык · 07.09.2026 · 20:00» (TЗ §8.4). */
export function groupNameFor(
  code: string,
  language: "en" | "ru",
  startDate: string,
  practiceStart: string,
): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  const label = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
  return `${code} · ${languageNameRu(language)} · ${label} · ${practiceStart}`;
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
