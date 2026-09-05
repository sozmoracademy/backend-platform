import { dayAgenda, weekPlan, activityDatesFor, streakDays, practiceStats, testsStats } from "./schedule";

const today = "2026-08-18";

describe("dayAgenda", () => {
  it("собирает завершённые уроки/тесты/встречи за конкретную дату, сортирует по времени", () => {
    const items = dayAgenda({
      completedAtByOrder: new Map([[1, today]]),
      lessons: [{ order: 1, title: "Lesson 1" }],
      tests: [{ id: "t1", lessonOrder: 1, title: "Тест 1" }],
      attempts: [
        {
          testId: "t1",
          status: "submitted",
          expiresAt: today,
          score: 90,
          passed: true,
          submittedAt: `${today}T10:00:00Z`,
        },
      ],
      meetings: [
        {
          id: "m1",
          lessonOrder: 1,
          date: today,
          startTime: "09:00",
          endTime: "10:00",
          meetUrl: "url",
          status: "scheduled",
        },
      ],
      date: today,
    });
    expect(items.map((i) => i.kind)).toEqual(["lesson", "test", "practice"]);
  });

  it("пусто, если в этот день ничего не было", () => {
    expect(
      dayAgenda({
        completedAtByOrder: new Map(),
        lessons: [],
        tests: [],
        attempts: [],
        meetings: [],
        date: today,
      }),
    ).toEqual([]);
  });
});

describe("weekPlan", () => {
  const lessons = [
    { order: 1, title: "L1", duration: "10:00" },
    { order: 2, title: "L2", duration: "12:00" },
  ];

  it("выходной в 7-й день ритма", () => {
    const week = [
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ];
    const days = weekPlan({
      openedUpTo: 1,
      completedOrders: new Set(),
      lessons,
      meetings: [],
      week,
      today,
      dayAgendaOf: () => [],
    });
    expect(days[6]!.kind).toBe("rest");
    expect(days[6]!.status).toBe("rest");
  });

  it("today помечает текущий день", () => {
    const week = ["2026-08-17", "2026-08-18"];
    const days = weekPlan({
      openedUpTo: 1,
      completedOrders: new Set(),
      lessons,
      meetings: [],
      week,
      today,
      dayAgendaOf: () => [],
    });
    expect(days[1]!.status).toBe("today");
  });
});

describe("streakDays", () => {
  it("считает подряд идущие дни назад от today", () => {
    const dates = new Set(["2026-08-18", "2026-08-17", "2026-08-16", "2026-08-14"]);
    expect(streakDays(dates, today)).toBe(3);
  });

  it("0, если вчера тоже не было активности", () => {
    expect(streakDays(new Set(["2026-08-10"]), today)).toBe(0);
  });
});

describe("activityDatesFor", () => {
  it("собирает даты завершений уроков, сдач тестов и посещённых практик", () => {
    const dates = activityDatesFor({
      completedAtByOrder: new Map([[1, "2026-08-10"]]),
      attempts: [
        {
          testId: "t1",
          status: "submitted",
          expiresAt: today,
          score: 80,
          passed: true,
          submittedAt: "2026-08-11T00:00:00Z",
        },
      ],
      meetings: [
        {
          id: "m1",
          lessonOrder: 1,
          date: "2026-08-12",
          startTime: "09:00",
          endTime: "10:00",
          meetUrl: "",
          status: "completed",
        },
      ],
    });
    expect([...dates].sort()).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
  });
});

describe("practiceStats", () => {
  it("считает только завершившиеся встречи (не scheduled)", () => {
    expect(
      practiceStats([{ status: "scheduled" }, { status: "completed" }, { status: "cancelled" }]),
    ).toEqual({ total: 2, attended: 1 });
  });
});

describe("testsStats", () => {
  it("считает доступные (published, lessonOrder <= openedUpTo) и пройденные тесты", () => {
    const stats = testsStats({
      openedUpTo: 2,
      tests: [
        { lessonOrder: 1, status: "published" },
        { lessonOrder: 2, status: "published" },
        { lessonOrder: 3, status: "published" },
        { lessonOrder: 1, status: "draft" },
      ],
      attemptsByTest: new Map([
        ["test-1", [{ status: "submitted", expiresAt: today, score: 90, passed: true }]],
      ]),
      testIdByLessonOrder: new Map([[1, "test-1"]]),
    });
    expect(stats).toEqual({ total: 2, passed: 1 });
  });
});
