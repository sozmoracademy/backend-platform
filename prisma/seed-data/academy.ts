// Копия преподавателей/групп/учеников/встреч/заметок/теста из
// english-flow/src/lib/mock-data.ts (BACKEND.md §13). Даты — абсолютные, как в
// референсе; `prisma/seed.ts` сдвигает их на разницу между `SEED_TODAY` и
// `REFERENCE_TODAY`, чтобы демо-данные оставались согласованы с «сегодня».

import { productIdFor } from "./curriculum";

export const REFERENCE_TODAY = "2026-08-18";

export type LanguageCode = "en" | "ru";
export type CourseType = "GROUP" | "INDIVIDUAL";
export type AccessStatus = "active" | "expired" | "disabled";
export type GroupStatus = "recruiting" | "active" | "finished" | "archived";
export type TeacherStatus = "active" | "absent" | "replacement";

export interface SeedTeacher {
  id: string;
  name: string;
  languages: LanguageCode[];
  status: TeacherStatus;
  phone: string;
  tone: string;
}

export const TEACHERS: SeedTeacher[] = [
  { id: "t1", name: "Айжан Осмонова", languages: ["en"], status: "active", phone: "+996 700 010 011", tone: "var(--tone-1)" },
  { id: "t2", name: "Бек Турдубеков", languages: ["en"], status: "active", phone: "+996 700 010 022", tone: "var(--tone-2)" },
  { id: "t3", name: "Азамат Кылычбеков", languages: ["en", "ru"], status: "replacement", phone: "+996 700 010 033", tone: "var(--tone-3)" },
  { id: "t4", name: "Динара Асанова", languages: ["ru"], status: "active", phone: "+996 700 010 044", tone: "var(--tone-4)" },
  { id: "t5", name: "Гульнара Садыкова", languages: ["ru"], status: "absent", phone: "+996 700 010 055", tone: "var(--tone-5)" },
  { id: "t6", name: "Мээрим Абдыраева", languages: ["en", "ru"], status: "active", phone: "+996 700 010 066", tone: "var(--tone-2)" },
];

export interface SeedGroup {
  id: string;
  code: string;
  name: string;
  language: LanguageCode;
  durationMonths: number;
  courseProductId: string;
  startDate: string;
  endDate: string;
  practiceStart: string;
  practiceEnd: string;
  teacherId: string | null;
  maxStudents: number;
  status: GroupStatus;
  currentLesson: number;
  meetUrl: string;
}

function groupCodePrefix(language: LanguageCode) {
  return language === "en" ? "EN" : "RU";
}

function languageNameRu(code: LanguageCode) {
  return code === "en" ? "Английский язык" : "Русский язык";
}

function groupName(code: string, language: LanguageCode, startDate: string, time: string) {
  const d = new Date(startDate);
  const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return `${code} · ${languageNameRu(language)} · ${label} · ${time}`;
}

function endAfterMonths(startDate: string, months: number) {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

interface GroupRow {
  id: string;
  language: LanguageCode;
  durationMonths: number;
  startDate: string;
  practiceStart: string;
  practiceEnd: string;
  teacherId: string | null;
  status: GroupStatus;
  currentLesson: number;
  meetUrl: string;
  maxStudents: number;
}

function makeGroupRow(
  id: string,
  language: LanguageCode,
  startDate: string,
  practiceStart: string,
  practiceEnd: string,
  teacherId: string | null,
  status: GroupStatus,
  currentLesson: number,
  meetUrl: string,
  maxStudents = 50,
  durationMonths = 6,
): GroupRow {
  return {
    id,
    language,
    durationMonths,
    startDate,
    practiceStart,
    practiceEnd,
    teacherId,
    status,
    currentLesson,
    meetUrl,
    maxStudents,
  };
}

/** Нумерует потоки по языку в порядке даты старта: EN-01, EN-02, … / RU-01, … */
function assignGroupCodes(rows: GroupRow[]): SeedGroup[] {
  const counters: Record<string, number> = {};
  const codeById: Record<string, string> = {};
  for (const g of [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const prefix = groupCodePrefix(g.language);
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    codeById[g.id] = `${prefix}-${String(counters[prefix]).padStart(2, "0")}`;
  }
  return rows.map((g) => {
    const code = codeById[g.id]!;
    return {
      id: g.id,
      code,
      name: groupName(code, g.language, g.startDate, g.practiceStart),
      language: g.language,
      durationMonths: g.durationMonths,
      courseProductId: productIdFor(g.language, "GROUP", g.durationMonths),
      startDate: g.startDate,
      endDate: endAfterMonths(g.startDate, g.durationMonths),
      practiceStart: g.practiceStart,
      practiceEnd: g.practiceEnd,
      teacherId: g.teacherId,
      maxStudents: g.maxStudents,
      status: g.status,
      currentLesson: g.currentLesson,
      meetUrl: g.meetUrl,
    };
  });
}

export const GROUPS: SeedGroup[] = assignGroupCodes([
  makeGroupRow("g-en-0824", "en", "2026-08-18", "20:00", "21:00", "t1", "active", 4, "https://meet.google.com/eng-0818-grp"),
  makeGroupRow("g-en-0907", "en", "2026-09-07", "20:00", "21:00", "t2", "recruiting", 1, "https://meet.google.com/eng-0907-grp"),
  makeGroupRow("g-en-0914", "en", "2026-09-14", "21:00", "22:00", null, "recruiting", 1, ""),
  makeGroupRow("g-en-0921", "en", "2026-09-21", "21:00", "22:00", null, "recruiting", 1, "https://meet.google.com/eng-0921-grp"),
  makeGroupRow("g-ru-0824", "ru", "2026-08-18", "20:00", "21:00", "t4", "active", 4, "https://meet.google.com/rus-0818-grp"),
  makeGroupRow("g-ru-0907", "ru", "2026-09-07", "20:00", "21:00", "t5", "recruiting", 1, ""),
  makeGroupRow("g-ru-0914", "ru", "2026-09-14", "21:00", "22:00", null, "recruiting", 1, "https://meet.google.com/rus-0914-grp"),
  makeGroupRow("g-en-0518", "en", "2026-05-10", "21:00", "22:00", "t1", "finished", 54, "https://meet.google.com/eng-old-grp"),
  // Демо-группы на 3-месячном тарифе — для ручной проверки per-product сценариев.
  makeGroupRow("g-en-0928", "en", "2026-09-28", "19:00", "20:00", "t2", "recruiting", 1, "https://meet.google.com/eng-0928-grp", 50, 3),
  makeGroupRow("g-ru-0928", "ru", "2026-09-28", "19:00", "20:00", "t5", "recruiting", 1, "https://meet.google.com/rus-0928-grp", 50, 3),
]);

export interface SeedPayment {
  totalCost: number;
  paid: number;
  purchaseDate: string;
}

export interface SeedStudent {
  id: string;
  login: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  language: LanguageCode;
  type: CourseType;
  age: number | null;
  city: string;
  groupId: string | null;
  teacherId: string | null;
  startDate: string;
  endDate: string;
  status: AccessStatus;
  openedUpTo: number;
  completed: number[];
  completedAt: Record<number, string>;
  watched: Record<number, number>;
  lastActivity: string;
  avatarTone: string;
  onboarded: boolean;
  managerName: string;
  payment: SeedPayment;
}

function payment(total: number, paid: number, purchaseDate: string): SeedPayment {
  return { totalCost: total, paid, purchaseDate };
}

const HAND_STUDENTS: SeedStudent[] = [
  {
    id: "s1", login: "kanat", password: "test123", firstName: "Канат", lastName: "Уметов",
    phone: "+996 700 112 233", language: "en", type: "GROUP", age: 27, city: "Бишкек",
    groupId: "g-en-0824", teacherId: "t1", startDate: "2026-08-18", endDate: "2027-02-18",
    status: "active", openedUpTo: 4, completed: [1, 2], completedAt: { 1: "2026-08-18", 2: "2026-08-20" },
    watched: { 3: 40 }, lastActivity: "2026-08-18", avatarTone: "var(--tone-1)", onboarded: true,
    managerName: "Нурбол", payment: payment(15000, 15000, "2026-08-10"),
  },
  {
    id: "s2", login: "alina", password: "test123", firstName: "Алина", lastName: "Ким",
    phone: "+996 555 908 771", language: "en", type: "GROUP", age: 24, city: "Бишкек",
    groupId: "g-en-0824", teacherId: "t1", startDate: "2026-08-18", endDate: "2027-02-18",
    status: "active", openedUpTo: 4, completed: [1, 2, 3], completedAt: { 1: "2026-08-18", 2: "2026-08-19", 3: "2026-08-21" },
    watched: {}, lastActivity: "2026-08-17", avatarTone: "var(--tone-2)", onboarded: true,
    managerName: "Нурбол", payment: payment(15000, 7500, "2026-08-11"),
  },
  {
    id: "s3", login: "aibek", password: "test123", firstName: "Айбек", lastName: "Сатыбалдиев",
    phone: "+996 707 445 010", language: "en", type: "INDIVIDUAL", age: 31, city: "Ош",
    groupId: null, teacherId: "t2", startDate: "2026-08-05", endDate: "2026-09-05",
    status: "active", openedUpTo: 7, completed: [1, 2, 3, 4, 5, 6], completedAt: { 1: "2026-08-05" },
    watched: { 7: 60 }, lastActivity: "2026-08-18", avatarTone: "var(--tone-3)", onboarded: true,
    managerName: "Нурбол", payment: payment(20000, 20000, "2026-08-01"),
  },
  {
    id: "s4", login: "nurai", password: "test123", firstName: "Нурай", lastName: "Асанова",
    phone: "+996 559 220 118", language: "en", type: "GROUP", age: 29, city: "Каракол",
    groupId: "g-en-0518", teacherId: "t1", startDate: "2026-05-10", endDate: "2026-11-10",
    status: "expired", openedUpTo: 54, completed: Array.from({ length: 40 }, (_, i) => i + 1),
    completedAt: {}, watched: {}, lastActivity: "2026-08-09", avatarTone: "var(--tone-4)", onboarded: true,
    managerName: "Азамат", payment: payment(15000, 15000, "2026-05-02"),
  },
  {
    id: "s5", login: "elmira", password: "test123", firstName: "Эльмира", lastName: "Джолдошева",
    phone: "+996 700 330 447", language: "ru", type: "INDIVIDUAL", age: 22, city: "Джалал-Абад",
    groupId: null, teacherId: "t4", startDate: "2026-08-12", endDate: "2026-09-12",
    status: "disabled", openedUpTo: 1, completed: [], completedAt: {}, watched: {},
    lastActivity: "2026-08-14", avatarTone: "var(--tone-5)", onboarded: false,
    managerName: "Нурбол", payment: payment(20000, 5000, "2026-08-12"),
  },
];

const TONES = ["var(--tone-1)", "var(--tone-2)", "var(--tone-3)", "var(--tone-4)", "var(--tone-5)"];
const CITIES = ["Бишкек", "Ош", "Джалал-Абад", "Каракол", "Токмок", "Нарын", "Талас", "Баткен"];
const FIRST_NAMES = ["Айгерим", "Нурбек", "Азиз", "Салтанат", "Тимур", "Жамиля", "Эрлан", "Гулназ", "Максат", "Асель", "Бакыт", "Динара", "Руслан", "Чолпон", "Данияр", "Айпери", "Кубат", "Мээрим", "Улан", "Назгуль"];
const LAST_NAMES = ["Абдиев", "Токтосунова", "Мамытов", "Исакова", "Орозов", "Бекова", "Сыдыков", "Алиева", "Жумабаев", "Турсунова", "Касымов", "Эргешова", "Досов", "Бейшеналиева", "Уметалиев", "Кадырова"];

function productPriceAndDuration(language: LanguageCode, type: CourseType, durationMonths: number) {
  if (type === "INDIVIDUAL") return { price: 20000, durationMonths: 1 };
  const basePrice = language === "en" ? 15000 : 12000;
  // 3-месячный тариф вдвое короче — цена пропорционально ниже 6-месячного.
  return { price: durationMonths === 3 ? Math.round(basePrice * 0.6) : basePrice, durationMonths };
}

function generateStudents(count: number): SeedStudent[] {
  const recruitingGroups = GROUPS.filter((g) => g.status === "recruiting" || g.status === "active");
  const out: SeedStudent[] = [];
  for (let i = 0; i < count; i++) {
    const n = i + 6;
    const language: LanguageCode = i % 3 === 0 ? "ru" : "en";
    const isIndividual = i % 7 === 0;
    const type: CourseType = isIndividual ? "INDIVIDUAL" : "GROUP";
    const pool = recruitingGroups.filter((g) => g.language === language);
    const group = !isIndividual && pool.length ? pool[i % pool.length]! : null;
    const product = productPriceAndDuration(language, type, group?.durationMonths ?? 6);
    const startDate = group ? group.startDate : "2026-08-20";
    const openedUpTo = group ? group.currentLesson : 1 + (i % 6);
    const completedCount = Math.max(0, Math.min(openedUpTo - 1, (i * 3) % (openedUpTo + 1)));
    const status: AccessStatus = i % 13 === 0 ? "expired" : i % 17 === 0 ? "disabled" : "active";
    const lastActivity =
      i % 5 === 0 ? "2026-08-12" : i % 3 === 0 ? "2026-08-16" : i % 2 === 0 ? "2026-08-17" : "2026-08-18";
    const teacherId = isIndividual
      ? (TEACHERS.filter((t) => t.languages.includes(language))[i % 2]?.id ?? null)
      : (group?.teacherId ?? null);
    const paid = i % 4 === 0 ? Math.round(product.price * 0.3) : product.price;
    out.push({
      id: `s${n}`,
      login: `student${n}`,
      password: "test123",
      firstName: FIRST_NAMES[i % FIRST_NAMES.length]!,
      lastName: LAST_NAMES[i % LAST_NAMES.length]!,
      phone: `+996 ${500 + (i % 99)} ${100 + (i % 800)} ${100 + (i % 800)}`,
      language,
      type,
      age: 18 + (i % 30),
      city: CITIES[i % CITIES.length]!,
      groupId: group?.id ?? null,
      teacherId,
      startDate,
      endDate: endAfterMonths(startDate, product.durationMonths),
      status,
      openedUpTo,
      completed: Array.from({ length: completedCount }, (_, k) => k + 1),
      completedAt: {},
      watched: completedCount < openedUpTo ? { [openedUpTo]: (i * 17) % 100 } : {},
      lastActivity,
      avatarTone: TONES[i % TONES.length]!,
      onboarded: i % 6 !== 0,
      managerName: ["Нурбол", "Азамат", "Салима"][i % 3]!,
      payment: payment(product.price, paid, startDate),
    });
  }
  return out;
}

export const STUDENTS: SeedStudent[] = [...HAND_STUDENTS, ...generateStudents(46)];

export const CURATOR = {
  id: "c1",
  login: "curator",
  password: "test123",
  name: "Мээрим Абдыраева",
};

export interface SeedMeeting {
  id: string;
  courseProductId: string;
  lessonOrder: number;
  scope: "GROUP" | "INDIVIDUAL";
  groupId: string | null;
  studentId: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetUrl: string;
  status: "scheduled" | "completed" | "cancelled";
  attended?: string[];
}

const EN_GROUP_6MO = productIdFor("en", "GROUP", 6);
const RU_GROUP_6MO = productIdFor("ru", "GROUP", 6);
const EN_INDIVIDUAL_1MO = productIdFor("en", "INDIVIDUAL", 1);

export const MEETINGS: SeedMeeting[] = [
  {
    id: "m1", courseProductId: EN_GROUP_6MO, lessonOrder: 4, scope: "GROUP", groupId: "g-en-0824", studentId: null,
    title: "Практика: Артикли a / an / the", date: "2026-08-19", startTime: "20:00", endTime: "21:00",
    meetUrl: "https://meet.google.com/eng-0818-grp", status: "scheduled",
  },
  {
    id: "m2", courseProductId: EN_GROUP_6MO, lessonOrder: 5, scope: "GROUP", groupId: "g-en-0824", studentId: null,
    title: "Практика: Множественное число", date: "2026-08-21", startTime: "20:00", endTime: "21:00",
    meetUrl: "https://meet.google.com/eng-0818-grp", status: "scheduled",
  },
  {
    id: "m3", courseProductId: EN_GROUP_6MO, lessonOrder: 3, scope: "GROUP", groupId: "g-en-0824", studentId: null,
    title: "Практика: Личные местоимения", date: "2026-08-17", startTime: "20:00", endTime: "21:00",
    meetUrl: "https://meet.google.com/eng-0818-grp", status: "completed", attended: ["s1", "s2"],
  },
  {
    id: "m4", courseProductId: RU_GROUP_6MO, lessonOrder: 4, scope: "GROUP", groupId: "g-ru-0824", studentId: null,
    title: "Практика: Русский · Lesson 4", date: "2026-08-19", startTime: "20:00", endTime: "21:00",
    meetUrl: "https://meet.google.com/rus-0818-grp", status: "scheduled",
  },
  {
    id: "m5", courseProductId: EN_INDIVIDUAL_1MO, lessonOrder: 7, scope: "INDIVIDUAL", groupId: null, studentId: "s3",
    title: "Индивидуальная практика: Числа и время", date: "2026-08-19", startTime: "19:00", endTime: "20:00",
    meetUrl: "https://meet.google.com/ind-aibek-01", status: "scheduled",
  },
];

export interface SeedNote {
  id: string;
  studentId: string;
  author: string;
  content: string;
  createdAt: string;
}

export const NOTES: SeedNote[] = [
  {
    id: "n1", studentId: "s1", author: "Мээрим Абдыраева",
    content:
      "Ученик хорошо понимает теорию, но испытывает сложности с разговорной речью. Обратить внимание на Past Simple, vocabulary и уверенность в speaking.",
    createdAt: "2026-08-16",
  },
  {
    id: "n2", studentId: "s3", author: "Мээрим Абдыраева",
    content: "Очень мотивирован, просит больше домашней практики. Можно ускорить темп.",
    createdAt: "2026-08-14",
  },
];

export interface SeedOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface SeedQuestion {
  id: string;
  text: string;
  type: "single" | "multiple";
  order: number;
  options: SeedOption[];
}

function makeQuestion(order: number, text: string, correctIndex: number, options: string[]): SeedQuestion {
  return {
    id: `l1q${order}`,
    text,
    type: "single",
    order,
    options: options.map((o, i) => ({ id: `l1q${order}o${i + 1}`, text: o, isCorrect: i === correctIndex })),
  };
}

export interface SeedTest {
  id: string;
  courseProductId: string;
  lessonOrder: number;
  title: string;
  timeLimitSec: number;
  passingScore: number;
  status: "draft" | "published";
  questions: SeedQuestion[];
}

export const TESTS: SeedTest[] = [
  {
    id: "test-1",
    courseProductId: EN_GROUP_6MO,
    lessonOrder: 1,
    title: "Тест к уроку 1",
    timeLimitSec: 300,
    passingScore: 70,
    status: "published",
    questions: [
      makeQuestion(1, "What is your name?", 0, ["My name is Anna.", "I name Anna.", "Me is Anna.", "My names Anna."]),
      makeQuestion(2, "How are you?", 0, ["Fine, thank you.", "I'm 20 years.", "I am from Bishkek.", "My name is Kanat."]),
      makeQuestion(3, "Choose the correct greeting for the morning.", 1, ["Good night", "Good morning", "Good evening", "Goodbye"]),
      makeQuestion(4, 'Which letter comes after "D" in the English alphabet?', 2, ["C", "F", "E", "B"]),
      makeQuestion(5, '"___ you later" — choose the correct word.', 3, ["Hello", "Please", "Sorry", "See"]),
      makeQuestion(6, 'Choose the correct response to "Nice to meet you".', 0, ["Nice to meet you too.", "You are welcome.", "I'm sorry.", "Good luck."]),
      makeQuestion(7, "Which word is a polite way to say goodbye?", 1, ["Hi", "Bye", "What", "Yes"]),
      makeQuestion(8, 'Complete: "Thank you very ___."', 2, ["good", "well", "much", "nice"]),
    ],
  },
];
