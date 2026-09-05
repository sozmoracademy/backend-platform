// Копия программы курса из english-flow/src/lib/mock-data.ts (BACKEND.md §13) —
// 54 урока, 6 блоков программы, 4 продукта (EN/RU × Group/Individual). Единственный
// источник контента для `prisma/seed.ts`.

export type CefrLevel = "A1" | "A2" | "B1" | "B2";

export interface SeedLesson {
  order: number;
  title: string;
  description: string;
  block: string;
}

const titles: [string, string, string][] = [
  ["Знакомство и алфавит", "Greetings, the alphabet and first phrases", "Foundation"],
  ["Verb to be", "Am / is / are в утверждении и отрицании", "Foundation"],
  ["Личные местоимения", "I, you, he, she, it, we, they", "Foundation"],
  ["Артикли a / an / the", "Когда нужен артикль и когда его нет", "Foundation"],
  ["Множественное число", "Regular and irregular plurals", "Foundation"],
  ["This / that / these / those", "Указательные местоимения в речи", "Foundation"],
  ["Числа и время", "Numbers, dates and telling the time", "Foundation"],
  ["Present Simple", "Ежедневные действия и расписание", "Grammar Core"],
  ["Present Simple: вопросы", "Do / does и порядок слов", "Grammar Core"],
  ["Наречия частотности", "Always, usually, sometimes, never", "Grammar Core"],
  ["Present Continuous", "Действия в момент речи", "Grammar Core"],
  ["Simple vs Continuous", "Разница между двумя временами", "Grammar Core"],
  ["Предлоги места", "In, on, at, under, between", "Grammar Core"],
  ["There is / there are", "Описание комнаты и города", "Grammar Core"],
  ["Модальный глагол can", "Способности и просьбы", "Grammar Core"],
  ["Past Simple: to be", "Was / were в рассказе о прошлом", "Past & Future"],
  ["Past Simple: правильные глаголы", "Окончание -ed и произношение", "Past & Future"],
  ["Present Perfect", "Опыт и результат в настоящем", "Past & Future"],
  ["Present Perfect vs Past Simple", "Когда какое время выбрать", "Past & Future"],
  ["Неправильные глаголы", "Топ-50 форм для разговора", "Past & Future"],
  ["Past Continuous", "Фон и длительное действие в прошлом", "Past & Future"],
  ["Future: will", "Решения, прогнозы и обещания", "Past & Future"],
  ["Future: going to", "Планы и намерения", "Past & Future"],
  ["Present для будущего", "Расписания и договорённости", "Past & Future"],
  ["Степени сравнения", "Comparatives and superlatives", "Vocabulary"],
  ["Countable / uncountable", "Some, any, much, many", "Vocabulary"],
  ["Еда и заказ в кафе", "Ordering food like a local", "Vocabulary"],
  ["Путешествия", "Airport, hotel, directions", "Vocabulary"],
  ["Работа и профессии", "Talking about your job", "Vocabulary"],
  ["Семья и отношения", "Describing people you love", "Vocabulary"],
  ["Внешность и характер", "Adjectives for people", "Vocabulary"],
  ["Дом и быт", "Household vocabulary", "Vocabulary"],
  ["Погода и природа", "Small talk about weather", "Vocabulary"],
  ["Шопинг", "Prices, sizes, returns", "Vocabulary"],
  ["Здоровье", "At the doctor's", "Vocabulary"],
  ["Модальные глаголы", "Must, should, have to", "Advanced Grammar"],
  ["Условные предложения 0 и 1", "Real conditionals", "Advanced Grammar"],
  ["Условные предложения 2", "Unreal present", "Advanced Grammar"],
  ["Пассивный залог", "Passive voice basics", "Advanced Grammar"],
  ["Косвенная речь", "Reported speech", "Advanced Grammar"],
  ["Герундий и инфинитив", "-ing or to do", "Advanced Grammar"],
  ["Фразовые глаголы", "Top 30 phrasal verbs", "Advanced Grammar"],
  ["Артикли: сложные случаи", "Geographical names and idioms", "Advanced Grammar"],
  ["Связки в речи", "Linking words for fluency", "Speaking"],
  ["Small talk", "Как начать и держать разговор", "Speaking"],
  ["Телефонный разговор", "Phone English", "Speaking"],
  ["Деловая переписка", "Emails that work", "Speaking"],
  ["Собеседование", "Job interview practice", "Speaking"],
  ["Презентация", "Presenting your idea", "Speaking"],
  ["Спор и аргументация", "Agreeing and disagreeing", "Speaking"],
  ["Идиомы", "Natural everyday idioms", "Speaking"],
  ["Произношение", "Sounds English learners miss", "Speaking"],
  ["Аудирование", "Understanding fast speech", "Speaking"],
  ["Финальный разбор", "Итоговая практика курса", "Speaking"],
];

const DEFAULT_VIDEO_URL = "/Video%20Project%201.mp4";

export const LESSONS: (SeedLesson & { videoUrl: string; duration: string })[] = titles.map(
  ([title, description, block], i) => ({
    order: i + 1,
    title,
    description,
    block,
    videoUrl: DEFAULT_VIDEO_URL,
    duration: `${10 + ((i * 7) % 12)}:${String((i * 13) % 60).padStart(2, "0")}`,
  }),
);

export interface SeedCourseBlock {
  name: string;
  title: string;
  level: CefrLevel;
  month: number;
}

export const COURSE_BLOCKS: SeedCourseBlock[] = [
  { name: "Foundation", level: "A1", month: 1, title: "Foundation" },
  { name: "Grammar Core", level: "A2", month: 2, title: "Everyday Grammar" },
  { name: "Past & Future", level: "B1", month: 3, title: "Past & Future" },
  { name: "Vocabulary", level: "B1", month: 4, title: "Vocabulary & Life" },
  { name: "Advanced Grammar", level: "B2", month: 5, title: "Advanced Grammar" },
  { name: "Speaking", level: "B2", month: 6, title: "Speaking & Fluency" },
];

const DEFAULT_LEVEL_PLAN: { month: number; level: CefrLevel }[] = [
  { month: 1, level: "A1" },
  { month: 2, level: "A2" },
  { month: 3, level: "B1" },
  { month: 4, level: "B1" },
  { month: 5, level: "B2" },
  { month: 6, level: "B2" },
];

export interface SeedCourseProduct {
  language: "en" | "ru";
  format: "GROUP" | "INDIVIDUAL";
  title: string;
  durationMonths: number;
  price: number;
  currency: string;
  features: string[];
  levelPlan: { month: number; level: CefrLevel }[];
}

export const COURSE_PRODUCTS: SeedCourseProduct[] = [
  {
    language: "en",
    format: "GROUP",
    title: "English Group",
    durationMonths: 6,
    price: 15000,
    currency: "сом",
    features: ["Теория", "Тесты", "Повторение", "Групповая практика", "Преподаватель", "Google Meet"],
    levelPlan: DEFAULT_LEVEL_PLAN,
  },
  {
    language: "ru",
    format: "GROUP",
    title: "Russian Group",
    durationMonths: 6,
    price: 12000,
    currency: "сом",
    features: ["Теория", "Тесты", "Повторение", "Групповая практика", "Преподаватель", "Google Meet"],
    levelPlan: DEFAULT_LEVEL_PLAN,
  },
  {
    language: "en",
    format: "INDIVIDUAL",
    title: "English Individual",
    durationMonths: 1,
    price: 20000,
    currency: "сом",
    features: ["Индивидуальная практика с преподавателем", "Та же теория, что в English Group"],
    levelPlan: DEFAULT_LEVEL_PLAN,
  },
  {
    language: "ru",
    format: "INDIVIDUAL",
    title: "Russian Individual",
    durationMonths: 1,
    price: 20000,
    currency: "сом",
    features: ["Индивидуальная практика с преподавателем", "Та же теория, что в Russian Group"],
    levelPlan: DEFAULT_LEVEL_PLAN,
  },
];
