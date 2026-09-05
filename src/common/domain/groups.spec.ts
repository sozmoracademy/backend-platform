import { teacherGroupConflict, findMatchingGroup, groupStage } from "./groups";

describe("teacherGroupConflict", () => {
  const groups = [
    { id: "g1", teacherId: "t1", practiceStart: "20:00", status: "active" as const },
    { id: "g2", teacherId: "t1", practiceStart: "21:00", status: "active" as const },
    { id: "g3", teacherId: "t2", practiceStart: "20:00", status: "finished" as const },
  ];

  it("находит конфликт для того же слота у активной/набираемой группы", () => {
    expect(teacherGroupConflict(groups, "t1", "20:00")?.id).toBe("g1");
  });

  it("нет конфликта для другого слота", () => {
    expect(teacherGroupConflict(groups, "t1", "22:00")).toBeUndefined();
  });

  it("finished/archived группы не считаются конфликтом", () => {
    expect(teacherGroupConflict(groups, "t2", "20:00")).toBeUndefined();
  });

  it("исключает саму группу при редактировании (exceptGroupId)", () => {
    expect(teacherGroupConflict(groups, "t1", "20:00", "g1")).toBeUndefined();
  });
});

describe("findMatchingGroup", () => {
  const groups = [
    { id: "g1", language: "en", status: "recruiting" as const, startDate: "2026-09-07", practiceStart: "20:00", studentCount: 10, maxStudents: 50 },
    { id: "g2", language: "en", status: "recruiting" as const, startDate: "2026-09-01", practiceStart: "20:00", studentCount: 50, maxStudents: 50 },
    { id: "g3", language: "ru", status: "recruiting" as const, startDate: "2026-09-01", practiceStart: "20:00", studentCount: 0, maxStudents: 50 },
  ];

  it("выбирает первую по дате старта подходящую группу без переполнения", () => {
    expect(findMatchingGroup(groups, "en", "2026-08-20")?.id).toBe("g1");
  });

  it("полная группа исключается", () => {
    expect(findMatchingGroup(groups, "en", "2026-08-20")?.id).not.toBe("g2");
  });

  it("нет группы для другого языка", () => {
    expect(findMatchingGroup(groups, "de" as never, "2026-08-20")).toBeUndefined();
  });
});

describe("groupStage", () => {
  it("месяц/уровень по currentLesson группы", () => {
    const levelPlan = [{ month: 1, level: "A1" as const }];
    expect(groupStage(4, levelPlan)).toEqual({ month: 1, level: "A1", lesson: 4 });
  });
});
