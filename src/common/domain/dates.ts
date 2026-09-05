/**
 * Чистые дата-хелперы. Порт `frontend/src/shared/lib/date.ts` (который сам —
 * порт `english-flow/src/lib/store.tsx`), адаптированный на реальную дату в
 * таймзоне школы вместо константы TODAY (TЗ §15.6). Не импортирует Nest/Prisma.
 */

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

/** «Сегодня» в таймзоне школы как `YYYY-MM-DD` (BACKEND.md §6, dates.ts). */
export function todayInTz(tz: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // en-CA → "YYYY-MM-DD"
}

/** Кол-во целых дней между `from` и `endDate` (может быть отрицательным). */
export function daysLeft(endDate: string, from: string): number {
  const diff = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(diff / 86_400_000);
}

/** Даты понедельника–воскресенья недели, в которую входит anchor. */
export function weekRange(anchor: string): string[] {
  const d = new Date(`${anchor}T00:00:00Z`);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

export function shiftWeek(anchor: string, weeks: number): string {
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** «Пн»…«Вс». */
export function weekdayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return WEEKDAYS_SHORT[(d.getUTCDay() + 6) % 7]!;
}

/** «Понедельник»…«Воскресенье». */
export function weekdayFull(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return WEEKDAYS_FULL[(d.getUTCDay() + 6) % 7]!;
}

/** «04:37» — таймер теста. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
