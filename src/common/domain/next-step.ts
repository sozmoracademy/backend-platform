import { testAvailability, type AttemptLike } from "./test-availability";

export interface NextStepLesson {
  order: number;
  title: string;
  description: string;
  duration: string;
}

export interface NextStepTest {
  lessonOrder: number;
  status: "draft" | "published";
  questionCount: number;
  timeLimitSec: number;
}

export interface NextStepMeeting {
  id: string;
  date: string;
  startTime: string;
  status: "scheduled" | "completed" | "cancelled";
}

export type NextStep<TLesson extends NextStepLesson = NextStepLesson, TMeeting extends NextStepMeeting = NextStepMeeting> =
  | { kind: "lesson"; lesson: TLesson }
  | { kind: "test"; lesson: TLesson; test: { questionCount: number; minutes: number } }
  | { kind: "practice"; meeting: TMeeting }
  | { kind: "done"; nextMeeting?: TMeeting };

/**
 * Порт `nextStepFor` из `store.tsx` (BACKEND.md §6). Порядок: первый незавершённый
 * открытый урок → первый доступный/непройденный/начатый тест среди завершённых
 * уроков → практика сегодня → «done» (+ ближайшая практика).
 */
export function nextStepFor<TLesson extends NextStepLesson, TTest extends NextStepTest, TAttempt extends AttemptLike & { lessonOrder: number }, TMeeting extends NextStepMeeting>(params: {
  openedUpTo: number;
  completedOrders: ReadonlySet<number>;
  lessons: TLesson[];
  tests: TTest[];
  attempts: TAttempt[];
  meetings: TMeeting[];
  today: string;
}): NextStep<TLesson, TMeeting> {
  const { openedUpTo, completedOrders, lessons, tests, attempts, meetings, today } = params;

  for (let order = 1; order <= openedUpTo; order++) {
    if (!completedOrders.has(order)) {
      const lesson = lessons.find((l) => l.order === order);
      if (lesson) return { kind: "lesson", lesson };
      break;
    }
  }

  const completedSorted = [...completedOrders].sort((a, b) => a - b);
  for (const order of completedSorted) {
    const test = tests.find((t) => t.lessonOrder === order);
    if (!test) continue;
    const testAttempts = attempts.filter((a) => a.lessonOrder === order);
    const availability = testAvailability(test.status, true, testAttempts, today);
    if (availability === "available" || availability === "failed" || availability === "in_progress") {
      const lesson = lessons.find((l) => l.order === order);
      if (lesson) {
        return {
          kind: "test",
          lesson,
          test: { questionCount: test.questionCount, minutes: Math.round(test.timeLimitSec / 60) },
        };
      }
    }
  }

  const todayMeeting = meetings.find((m) => m.status === "scheduled" && m.date === today);
  if (todayMeeting) return { kind: "practice", meeting: todayMeeting };

  const nextMeeting = meetings
    .filter((m) => m.status === "scheduled" && m.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
  return nextMeeting ? { kind: "done", nextMeeting } : { kind: "done" };
}
