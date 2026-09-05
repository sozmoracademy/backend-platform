import { effectiveAccessStatus, type AccessInput } from "./access";
import { daysLeft } from "./dates";

export interface AttentionStudent extends AccessInput {
  id: string;
  lastActivity: string;
  onboarded: boolean;
}

export interface AttentionGroup {
  id: string;
  teacherId: string | null;
  meetUrl: string;
  status: "recruiting" | "active" | "finished" | "archived";
  endDate: string;
}

export interface AttentionBuckets<TStudent extends AttentionStudent, TGroup extends AttentionGroup> {
  idleStudents: TStudent[];
  groupsNoTeacher: TGroup[];
  groupsNoLink: TGroup[];
  notOnboarded: TStudent[];
  groupsEndingSoon: TGroup[];
}

const IDLE_DAYS = 3;
const ENDING_SOON_DAYS = 21;

/** Ученики с активным доступом, не заходившие `IDLE_DAYS`+ дней. */
export function idleActiveStudents<T extends AttentionStudent>(students: T[], today: string): T[] {
  return students.filter(
    (s) => effectiveAccessStatus(s, today) === "active" && -daysLeft(s.lastActivity, today) >= IDLE_DAYS,
  );
}

/** Порт `attentionBuckets` из `store.tsx` — куратор-дашборд, «Требует внимания» (BACKEND.md §6). */
export function attentionBuckets<TStudent extends AttentionStudent, TGroup extends AttentionGroup>(
  students: TStudent[],
  groups: TGroup[],
  today: string,
): AttentionBuckets<TStudent, TGroup> {
  const activeStudents = students.filter((s) => effectiveAccessStatus(s, today) === "active");
  const isLive = (g: TGroup) => g.status === "active" || g.status === "recruiting";
  return {
    idleStudents: idleActiveStudents(students, today),
    groupsNoTeacher: groups.filter((g) => !g.teacherId && isLive(g)),
    groupsNoLink: groups.filter((g) => !g.meetUrl && isLive(g)),
    notOnboarded: activeStudents.filter((s) => !s.onboarded),
    groupsEndingSoon: groups.filter(
      (g) =>
        g.status === "active" &&
        daysLeft(g.endDate, today) >= 0 &&
        daysLeft(g.endDate, today) <= ENDING_SOON_DAYS,
    ),
  };
}
