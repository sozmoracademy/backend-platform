import { transliterate, generateLogin, generatePassword } from "./credentials";

describe("transliterate", () => {
  it("кириллица → латиница, только [a-z0-9]", () => {
    expect(transliterate("Канат")).toBe("kanat");
    expect(transliterate("Мээрим-Абдыраева")).toBe("meerimabdyraeva");
  });
});

describe("generateLogin", () => {
  it("имя + последние 2 цифры телефона", () => {
    expect(generateLogin("Канат", "+996 700 112 233", new Set())).toBe("kanat33");
  });

  it("при занятости — случайные 2 цифры, уникальные", () => {
    const taken = new Set(["kanat33"]);
    const login = generateLogin("Канат", "+996 700 112 233", taken);
    expect(login.startsWith("kanat")).toBe(true);
    expect(taken.has(login)).toBe(false);
  });

  it("без телефона — фоллбек на случайные цифры", () => {
    const login = generateLogin("Канат", "", new Set());
    expect(login.startsWith("kanat")).toBe(true);
  });
});

describe("generatePassword", () => {
  it("5 латинских букв, уникальный", () => {
    const taken = new Set<string>();
    const pw = generatePassword(taken);
    expect(pw).toMatch(/^[a-z]{5}$/);
  });
});
