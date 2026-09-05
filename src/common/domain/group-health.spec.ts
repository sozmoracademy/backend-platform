import { groupHealth, idleBucketOf } from "./group-health";

const today = "2026-08-18";

describe("idleBucketOf", () => {
  it("active — простой < 3 дней", () => {
    expect(idleBucketOf("2026-08-17", today)).toBe("active");
  });
  it("at_risk — простой 3-4 дня", () => {
    expect(idleBucketOf("2026-08-15", today)).toBe("at_risk");
    expect(idleBucketOf("2026-08-14", today)).toBe("at_risk");
  });
  it("inactive — простой >= 5 дней", () => {
    expect(idleBucketOf("2026-08-13", today)).toBe("inactive");
  });
});

describe("groupHealth", () => {
  it("считает бакеты по всем ученикам", () => {
    const health = groupHealth(["2026-08-18", "2026-08-15", "2026-08-10"], today);
    expect(health).toEqual({ total: 3, active: 1, atRisk: 1, inactive: 1 });
  });

  it("пустая группа", () => {
    expect(groupHealth([], today)).toEqual({ total: 0, active: 0, atRisk: 0, inactive: 0 });
  });
});
