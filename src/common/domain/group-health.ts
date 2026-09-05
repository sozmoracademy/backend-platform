import { daysLeft } from "./dates";

export interface GroupHealth {
  total: number;
  active: number;
  atRisk: number;
  inactive: number;
}

export type IdleBucket = "active" | "at_risk" | "inactive";

/** Порог «неактивности» по дням простоя — общий для `groupHealth` и `idleBucketOf`. */
const AT_RISK_DAYS = 3;
const INACTIVE_DAYS = 5;

export function idleBucketOf(lastActivity: string, today: string): IdleBucket {
  const idle = -daysLeft(lastActivity, today);
  if (idle >= INACTIVE_DAYS) return "inactive";
  if (idle >= AT_RISK_DAYS) return "at_risk";
  return "active";
}

/** Порт `groupHealth` из `store.tsx` (BACKEND.md §6): по дням простоя учеников группы. */
export function groupHealth(lastActivities: string[], today: string): GroupHealth {
  let active = 0;
  let atRisk = 0;
  let inactive = 0;
  for (const lastActivity of lastActivities) {
    const bucket = idleBucketOf(lastActivity, today);
    if (bucket === "inactive") inactive++;
    else if (bucket === "at_risk") atRisk++;
    else active++;
  }
  return { total: lastActivities.length, active, atRisk, inactive };
}
