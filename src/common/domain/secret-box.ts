import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Обратимое шифрование коротких секретов (пароль ученика — чтобы куратор мог его
 * посмотреть на карточке). НЕ замена bcrypt-хешу: хеш остаётся для проверки на
 * логине, а это — параллельное хранилище «в читаемом виде», но зашифрованное
 * ключом из окружения бэкенда. Утечка одной БД пароли не раскрывает.
 *
 * AES-256-GCM. Ключ — sha256 от `CREDENTIALS_ENC_KEY` (принимаем строку любой
 * длины). Формат: `v1:` + base64(iv[12] ‖ tag[16] ‖ ciphertext).
 */

function keyOf(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "v1:" + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** `null` — не расшифровать (пусто / не тот формат / другой ключ / повреждено). */
export function openSecret(sealed: string | null | undefined, secret: string): string | null {
  if (!sealed || !sealed.startsWith("v1:")) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyOf(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
