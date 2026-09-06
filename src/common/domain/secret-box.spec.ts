import { openSecret, sealSecret } from "./secret-box";

const KEY = "test-credentials-enc-key";

describe("secret-box", () => {
  it("round-trips произвольную строку", () => {
    for (const s of ["kp7dm", "", "пароль-Ünïcode-😀", "a".repeat(200)]) {
      expect(openSecret(sealSecret(s, KEY), KEY)).toBe(s);
    }
  });

  it("каждый вызов даёт разный шифртекст (рандомный IV)", () => {
    expect(sealSecret("abc", KEY)).not.toBe(sealSecret("abc", KEY));
  });

  it("формат v1: + base64", () => {
    expect(sealSecret("abc", KEY)).toMatch(/^v1:[A-Za-z0-9+/]+=*$/);
  });

  it("не расшифровать другим ключом", () => {
    expect(openSecret(sealSecret("abc", KEY), "другой-ключ")).toBeNull();
  });

  it("не расшифровать повреждённое / чужого формата / пустое", () => {
    expect(openSecret(null, KEY)).toBeNull();
    expect(openSecret("", KEY)).toBeNull();
    expect(openSecret("plaintext", KEY)).toBeNull();
    expect(openSecret("v1:!!!not-base64!!!", KEY)).toBeNull();
    const sealed = sealSecret("abc", KEY);
    expect(openSecret(sealed.slice(0, -4) + "AAAA", KEY)).toBeNull();
  });
});
