import { monthOfLesson, levelForLesson } from "./program";

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
    expect(monthOfLesson(1)).toBe(1);
    expect(monthOfLesson(9)).toBe(1);
    expect(monthOfLesson(10)).toBe(2);
    expect(monthOfLesson(54)).toBe(6);
  });

  it("зажимает в [1, 6]", () => {
    expect(monthOfLesson(0)).toBe(1);
    expect(monthOfLesson(1000)).toBe(6);
  });
});

describe("levelForLesson", () => {
  it("по levelPlan: M1→A1 … M6→B2", () => {
    expect(levelForLesson(LEVEL_PLAN, 1)).toBe("A1");
    expect(levelForLesson(LEVEL_PLAN, 15)).toBe("A2");
    expect(levelForLesson(LEVEL_PLAN, 54)).toBe("B2");
  });

  it("фоллбек на A1, если план не покрывает месяц", () => {
    expect(levelForLesson([], 1)).toBe("A1");
  });
});
