/**
 * Порт генерации логина/пароля из `english-flow/src/lib/store.tsx` (BACKEND.md §6).
 * Серверная генерация — истина (в отличие от клиентского предпросмотра на фронте).
 */

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** «Канат» → «kanat»: транслитерация в латиницу, только буквы/цифры. */
export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
}

/** Логин из имени + двух последних цифр телефона; при занятости — случайные цифры до уникальности. */
export function generateLogin(firstName: string, phone: string, taken: ReadonlySet<string>): string {
  const base = transliterate(firstName) || "user";
  const digits = (phone.match(/\d/g) ?? []).join("");
  const tail = digits.slice(-2);
  if (tail.length === 2 && !taken.has(base + tail)) return base + tail;
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = base + randomDigits(2);
    if (!taken.has(candidate)) return candidate;
  }
  let login = "";
  do {
    login = base + randomDigits(4);
  } while (taken.has(login));
  return login;
}

/** Пароль из 5 случайных латинских букв, уникальный по базе. */
export function generatePassword(taken: ReadonlySet<string>): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let pw = "";
  do {
    pw = Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
  } while (taken.has(pw));
  return pw;
}
