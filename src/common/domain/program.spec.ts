import {
  monthOfLesson,
  levelForLesson,
  stageStatus,
  courseLevels,
  levelStatus,
  type CourseStage,
} from "./program";

const LEVEL_PLAN = [
  { month: 1, level: "A1" as const },
  { month: 2, level: "A2" as const },
  { month: 3, level: "B1" as const },
  { month: 4, level: "B1" as const },
  { month: 5, level: "B2" as const },
  { month: 6, level: "B2" as const },
];

describe("monthOfLesson", () => {
  it("урок 1 → месяц 1, урок 54 → месяц 6", () => {
    expect(monthOfLesson(1, 54, 6)).toBe(1);
    expect(monthOfLesson(9, 54, 6)).toBe(1);
    expect(monthOfLesson(10, 54, 6)).toBe(2);
    expect(monthOfLesson(54, 54, 6)).toBe(6);
  });

  it("зажимает в [1, 6]", () => {
    expect(monthOfLesson(0, 54, 6)).toBe(1);
    expect(monthOfLesson(1000, 54, 6)).toBe(6);
  });
});

describe("levelForLesson", () => {
  it("по levelPlan: M1→A1 … M6→B2", () => {
    expect(levelForLesson(LEVEL_PLAN, 1, 54, 6)).toBe("A1");
    expect(levelForLesson(LEVEL_PLAN, 15, 54, 6)).toBe("A2");
    expect(levelForLesson(LEVEL_PLAN, 54, 54, 6)).toBe("B2");
  });

  it("фоллбек на A1, если план не покрывает месяц", () => {
    expect(levelForLesson([], 1, 54, 6)).toBe("A1");
  });
});

describe("stageStatus", () => {
  it("completed, если все уроки блока завершены", () => {
    expect(stageStatus([1, 2], 2, new Set([1, 2]))).toBe("completed");
  });
  it("current, если хотя бы один урок блока открыт, но не всё завершено", () => {
    expect(stageStatus([1, 2, 3], 2, new Set([1]))).toBe("current");
  });
  it("locked, если ни один урок блока не открыт", () => {
    expect(stageStatus([5, 6], 2, new Set())).toBe("locked");
  });
  it("locked для пустого блока", () => {
    expect(stageStatus([], 2, new Set())).toBe("locked");
  });
});

describe("courseLevels / levelStatus", () => {
  const stages: CourseStage[] = [
    { block: "Foundation", level: "A1", month: 1 },
    { block: "Grammar Core", level: "A2", month: 2 },
  ];

  it("courseLevels возвращает уникальные уровни в порядке появления", () => {
    expect(courseLevels(stages)).toEqual(["A1", "A2"]);
  });

  it("levelStatus: completed, если все блоки уровня completed", () => {
    expect(levelStatus("A1", stages, () => "completed")).toBe("completed");
  });

  it("levelStatus: current, если хотя бы один блок current/completed", () => {
    expect(levelStatus("A1", stages, () => "current")).toBe("current");
  });

  it("levelStatus: locked, если все блоки уровня locked", () => {
    expect(levelStatus("A1", stages, () => "locked")).toBe("locked");
  });
});
