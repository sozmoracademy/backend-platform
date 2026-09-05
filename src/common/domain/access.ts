import { daysLeft } from "./dates";

export type AccessStatus = "active" | "expired" | "disabled";

export interface AccessInput {
  status: AccessStatus;
  /** `YYYY-MM-DD`. */
  endDate: string;
}

/**
 * Порт `accessStatus` из `english-flow/src/lib/store.tsx` (BACKEND.md §6).
 * `disabled` — если так помечен вручную; иначе `expired`, если `daysLeft(endDate) < 0`;
 * иначе исходный `status`.
 */
export function effectiveAccessStatus(student: AccessInput, today: string): AccessStatus {
  if (student.status === "disabled") return "disabled";
  return daysLeft(student.endDate, today) < 0 ? "expired" : student.status;
}
