import {
  daysLeft,
  weekRange,
  shiftWeek,
  weekdayShort,
  weekdayFull,
  formatDuration,
  todayInTz,
} from "./dates";

describe("dates", () => {
  it("daysLeft: положительная, отрицательная и нулевая разница", () => {
    expect(daysLeft("2026-08-20", "2026-08-18")).toBe(2);
    expect(daysLeft("2026-08-16", "2026-08-18")).toBe(-2);
    expect(daysLeft("2026-08-18", "2026-08-18")).toBe(0);
  });

  it("weekRange: возвращает понедельник-воскресенье, включающие anchor", () => {
    // 2026-08-18 — вторник
    const week = weekRange("2026-08-18");
    expect(week).toHaveLength(7);
    expect(week[0]).toBe("2026-08-17"); // понедельник
    expect(week[6]).toBe("2026-08-23"); // воскресенье
  });

  it("shiftWeek: сдвигает на N недель", () => {
    expect(shiftWeek("2026-08-18", 1)).toBe("2026-08-25");
  });

  it("weekdayShort/Full: корректные названия", () => {
    expect(weekdayShort("2026-08-17")).toBe("Пн");
    expect(weekdayFull("2026-08-23")).toBe("Воскресенье");
  });

  it("formatDuration: MM:SS", () => {
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(9)).toBe("00:09");
  });

  it("todayInTz: возвращает YYYY-MM-DD для заданной таймзоны", () => {
    const iso = todayInTz("Asia/Bishkek", new Date("2026-08-18T20:00:00Z"));
    expect(iso).toBe("2026-08-19"); // Bishkek = UTC+6
  });
});
