import { effectiveAccessStatus } from "./access";

describe("effectiveAccessStatus", () => {
  it("disabled побеждает всё остальное", () => {
    expect(effectiveAccessStatus({ status: "disabled", endDate: "2030-01-01" }, "2026-08-18")).toBe("disabled");
  });

  it("expired, если endDate < today, даже при status=active", () => {
    expect(effectiveAccessStatus({ status: "active", endDate: "2026-08-01" }, "2026-08-18")).toBe("expired");
  });

  it("active, если endDate >= today и status=active", () => {
    expect(effectiveAccessStatus({ status: "active", endDate: "2026-08-18" }, "2026-08-18")).toBe("active");
    expect(effectiveAccessStatus({ status: "active", endDate: "2026-09-01" }, "2026-08-18")).toBe("active");
  });

  it("возвращает исходный status, если не disabled и не просрочен", () => {
    expect(effectiveAccessStatus({ status: "expired", endDate: "2030-01-01" }, "2026-08-18")).toBe("expired");
  });
});
