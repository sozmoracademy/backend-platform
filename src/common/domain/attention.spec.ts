import { attentionBuckets, idleActiveStudents } from "./attention";

const today = "2026-08-18";

const students = [
  { id: "s1", status: "active" as const, endDate: "2026-09-01", lastActivity: "2026-08-10", onboarded: true },
  {
    id: "s2",
    status: "active" as const,
    endDate: "2026-09-01",
    lastActivity: "2026-08-18",
    onboarded: false,
  },
  {
    id: "s3",
    status: "disabled" as const,
    endDate: "2026-09-01",
    lastActivity: "2026-08-01",
    onboarded: true,
  },
];

const groups = [
  { id: "g1", teacherId: null, meetUrl: "", status: "active" as const, endDate: "2026-08-30" },
  {
    id: "g2",
    teacherId: "t1",
    meetUrl: "https://meet",
    status: "recruiting" as const,
    endDate: "2027-01-01",
  },
];

describe("idleActiveStudents", () => {
  it("только активные ученики, не заходившие 3+ дня", () => {
    expect(idleActiveStudents(students, today).map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("attentionBuckets", () => {
  it("собирает все бакеты", () => {
    const buckets = attentionBuckets(students, groups, today);
    expect(buckets.idleStudents.map((s) => s.id)).toEqual(["s1"]);
    expect(buckets.notOnboarded.map((s) => s.id)).toEqual(["s2"]);
    expect(buckets.groupsNoTeacher.map((g) => g.id)).toEqual(["g1"]);
    expect(buckets.groupsNoLink.map((g) => g.id)).toEqual(["g1"]);
    expect(buckets.groupsEndingSoon.map((g) => g.id)).toEqual(["g1"]);
  });

  it("disabled/expired группы не попадают в noTeacher/noLink", () => {
    const archived = [
      { id: "g3", teacherId: null, meetUrl: "", status: "archived" as const, endDate: "2026-08-30" },
    ];
    const buckets = attentionBuckets(students, archived, today);
    expect(buckets.groupsNoTeacher).toEqual([]);
  });
});
