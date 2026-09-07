import { currentLessonOrder } from "./lesson-progress";
import { bestAttemptOf, type AttemptLike } from "./test-availability";
import { weekdayFull } from "./dates";

export type DayItemKind = "lesson" | "test" | "practice";
export type DayItemStatus = "done" | "missed" | "scheduled" | "cancelled";

export interface DayAgendaItem {
  kind: DayItemKind;
  status: DayItemStatus;
  title: string;
  subtitle: string;
  time?: string;
  meetUrl?: string;
  lessonOrder: number;
}

export interface AgendaLesson {
  order: number;
  title: string;
}

export interface AgendaTest {
  id: string;
  lessonOrder: number;
  title: string;
}

export interface AgendaAttempt extends AttemptLike {
  testId: string;
  submittedAt: string | null;
}

export interface AgendaMeeting {
  id: string;
  lessonOrder: number;
  date: string;
  startTime: string;
  endTime: string;
  meetUrl: string;
  status: "scheduled" | "completed" | "cancelled";
}

/** Порт `dayAgenda` из `store.tsx` — события одного дня для «Моей недели» (BACKEND.md §12, `/me/dashboard`). */
export function dayAgenda(params: {
  completedAtByOrder: Map<number, string>;
  lessons: AgendaLesson[];
  tests: AgendaTest[];
  attempts: AgendaAttempt[];
  meetings: AgendaMeeting[];
  date: string;
}): DayAgendaItem[] {
  const { completedAtByOrder, lessons, tests, attempts, meetings, date } = params;
  const items: DayAgendaItem[] = [];

  for (const [order, completedDate] of completedAtByOrder) {
    if (completedDate !== date) continue;
    const lesson = lessons.find((l) => l.order === order);
    if (lesson) {
      items.push({
        kind: "lesson",
        status: "done",
        title: `Урок ${lesson.order}. ${lesson.title}`,
        subtitle: "Теория пройдена",
        lessonOrder: lesson.order,
      });
    }
  }

  for (const a of attempts) {
    if (a.status !== "submitted" || a.submittedAt?.slice(0, 10) !== date) continue;
    const test = tests.find((t) => t.id === a.testId);
    if (!test) continue;
    items.push({
      kind: "test",
      status: "done",
      title: test.title,
      subtitle: `${a.score}% · ${a.passed ? "пройден" : "не пройден"}`,
      lessonOrder: test.lessonOrder,
    });
  }

  for (const m of meetings) {
    if (m.date !== date) continue;
    items.push({
      kind: "practice",
      status: m.status === "completed" ? "done" : m.status === "cancelled" ? "cancelled" : "scheduled",
      title: `Практика`,
      subtitle: `${m.startTime}–${m.endTime}`,
      time: m.startTime,
      meetUrl: m.meetUrl,
      lessonOrder: m.lessonOrder,
    });
  }

  return items.sort((a, b) => (a.time ?? "00:00").localeCompare(b.time ?? "00:00"));
}

export interface WeekDayAgenda {
  date: string;
  items: DayAgendaItem[];
}

export function weekAgenda(
  week: string[],
  params: Omit<Parameters<typeof dayAgenda>[0], "date">,
): WeekDayAgenda[] {
  return week.map((date) => ({ date, items: dayAgenda({ ...params, date }) }));
}

export type WeekPlanKind = "theory" | "practice" | "rest";
export type WeekPlanStatus = "done" | "past" | "today" | "upcoming" | "locked" | "rest";

export interface WeekPlanDay {
  date: string;
  weekday: string;
  kind: WeekPlanKind;
  status: WeekPlanStatus;
  title: string;
  topic: string;
  meta: string;
  meetUrl?: string;
  /** Время начала практики "HH:mm" — для окна подключения на клиенте. */
  startTime?: string;
  lessonOrder?: number;
  /** Практика первой недели закрыта: текст оверлея поверх заблюренной карточки. */
  blurNotice?: string;
}

const PLAN_RHYTHM: { kind: WeekPlanKind; offset: number }[] = [
  { kind: "theory", offset: 0 },
  { kind: "practice", offset: 0 },
  { kind: "theory", offset: 1 },
  { kind: "practice", offset: 1 },
  { kind: "theory", offset: 2 },
  { kind: "practice", offset: 2 },
  { kind: "rest", offset: 0 },
];

const PLAN_LABEL: Record<WeekPlanKind, string> = { theory: "Теория", practice: "Практика", rest: "Выходной" };

/** Порт `weekPlan` из `store.tsx` — недельный план обучения (BACKEND.md §12, `/me/schedule`). */
export function weekPlan(params: {
  openedUpTo: number;
  completedOrders: ReadonlySet<number>;
  lessons: { order: number; title: string; duration: string }[];
  meetings: AgendaMeeting[];
  week: string[];
  today: string;
  /** Ученик на своей первой учебной неделе — практика ещё закрыта (сначала теория). */
  firstWeek: boolean;
  dayAgendaOf: (date: string) => DayAgendaItem[];
}): WeekPlanDay[] {
  const { openedUpTo, lessons, meetings, week, today, firstWeek, dayAgendaOf } = params;
  const currentOrder = currentLessonOrder(openedUpTo, params.completedOrders);
  const lessonAt = (offset: number) =>
    lessons.find((l) => l.order === currentOrder + offset) ?? lessons.find((l) => l.order === currentOrder);
  const groupRoom = meetings.find((m) => m.meetUrl)?.meetUrl;

  return week.map((date, i) => {
    const slot = PLAN_RHYTHM[i % PLAN_RHYTHM.length] ?? PLAN_RHYTHM[0]!;
    const lesson = lessonAt(slot.offset);
    const topic = lesson?.title ?? "занятие";
    const meeting = meetings.find((m) => m.date === date);
    const isRest = slot.kind === "rest";
    const isPractice = slot.kind === "practice";
    // Практика первой недели закрыта: новому ученику сначала нужно освоиться с теорией.
    const practiceLocked = isPractice && firstWeek;

    let status: WeekPlanStatus;
    if (isRest) status = "rest";
    else if (practiceLocked) status = "locked";
    else if (date < today) status = dayAgendaOf(date).length > 0 ? "done" : "past";
    else if (date === today) status = "today";
    else status = "locked";

    const meta = isRest
      ? "Отдыхай и возвращайся с новыми силами"
      : isPractice
        ? meeting
          ? `${meeting.startTime}–${meeting.endTime} · групповая`
          : "21:00–22:00 · групповая"
        : // Пока урок (и его видео) не заведён — не показываем «Видео · N мин».
          lesson
          ? `Видео · ${Number.parseInt(lesson.duration, 10)} мин`
          : "";

    const room = isPractice && !practiceLocked ? (meeting?.meetUrl ?? groupRoom) : undefined;
    const startTime = isPractice && !practiceLocked ? (meeting?.startTime ?? "21:00") : undefined;

    return {
      date,
      weekday: weekdayFull(date),
      kind: slot.kind,
      status,
      title: isRest ? "Выходной" : `${PLAN_LABEL[slot.kind]} · ${topic}`,
      topic,
      meta,
      ...(room ? { meetUrl: room } : {}),
      ...(startTime ? { startTime } : {}),
      ...(!isRest && lesson ? { lessonOrder: lesson.order } : {}),
      ...(practiceLocked ? { blurNotice: "Практика начнётся со следующей недели" } : {}),
    };
  });
}

/** Даты, в которые ученик сделал хотя бы одно учебное действие. */
export function activityDatesFor(params: {
  completedAtByOrder: Map<number, string>;
  attempts: AgendaAttempt[];
  meetings: AgendaMeeting[];
}): Set<string> {
  const dates = new Set<string>();
  for (const d of params.completedAtByOrder.values()) dates.add(d);
  for (const a of params.attempts) {
    if (a.status === "submitted" && a.submittedAt) dates.add(a.submittedAt.slice(0, 10));
  }
  for (const m of params.meetings) {
    if (m.status === "completed") dates.add(m.date);
  }
  return dates;
}

/** Число дней подряд (по `today` назад) с хотя бы одним учебным действием. */
export function streakDays(dates: ReadonlySet<string>, today: string): number {
  let count = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!dates.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

export function practiceStats(meetings: { status: "scheduled" | "completed" | "cancelled" }[]): {
  total: number;
  attended: number;
} {
  const finished = meetings.filter((m) => m.status !== "scheduled");
  const attended = finished.filter((m) => m.status === "completed").length;
  return { total: finished.length, attended };
}

/** Тесты, доступные ученику на текущий момент программы (`openedUpTo`), и сколько из них пройдено. */
export function testsStats(params: {
  openedUpTo: number;
  tests: { lessonOrder: number; status: "draft" | "published" }[];
  attemptsByTest: Map<string, AttemptLike[]>;
  testIdByLessonOrder: Map<number, string>;
}): { total: number; passed: number } {
  const accessible = params.tests.filter(
    (t) => t.status === "published" && t.lessonOrder <= params.openedUpTo,
  );
  const passed = accessible.filter((t) => {
    const testId = params.testIdByLessonOrder.get(t.lessonOrder);
    const attempts = testId ? (params.attemptsByTest.get(testId) ?? []) : [];
    return bestAttemptOf(attempts)?.passed;
  }).length;
  return { total: accessible.length, passed };
}
