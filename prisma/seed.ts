/**
 * Идемпотентный сид «с чистого листа» (BACKEND.md §13).
 *
 * Сидируется только то, без чего платформа не запускается:
 *   · каталог курсов — 6 продуктов (EN/RU × Group-3мес/Group-6мес/Individual-1мес)
 *     и CEFR-блоки A1..B2 (`prisma/seed-data/curriculum.ts`);
 *   · единственный аккаунт куратора (`prisma/seed-data/academy.ts` → CURATOR);
 *   · singleton `AppSettings`.
 *
 * Демо-данные (ученики, преподаватели, группы, уроки, видео, тесты, встречи,
 * заметки, попытки) больше НЕ сидируются — школа наполняет их сама.
 */
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Lang, type CourseType as PrismaCourseType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { COURSE_BLOCKS, COURSE_PRODUCTS } from "./seed-data/curriculum";
import { CURATOR } from "./seed-data/academy";

// Prisma 7 не читает `.env` сам и требует driver adapter в конструкторе.
// `dotenv` не переопределяет уже выставленные переменные — прогон из
// test/global-setup.js (DATABASE_URL от .env.test) не затрагивается.
loadEnv({ path: join(__dirname, "..", ".env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const BCRYPT_COST = 12;

async function seedCatalog() {
  for (const block of COURSE_BLOCKS) {
    await prisma.courseBlock.upsert({
      where: { name: block.name },
      update: { title: block.title, level: block.level, month: block.month },
      create: block,
    });
  }

  for (const product of COURSE_PRODUCTS) {
    await prisma.courseProduct.upsert({
      where: {
        language_format_durationMonths: {
          language: product.language as Lang,
          format: product.format as PrismaCourseType,
          durationMonths: product.durationMonths,
        },
      },
      update: {
        title: product.title,
        durationMonths: product.durationMonths,
        price: product.price,
        currency: product.currency,
        features: product.features,
        levelPlan: product.levelPlan,
      },
      create: {
        id: product.id,
        language: product.language as Lang,
        format: product.format as PrismaCourseType,
        title: product.title,
        durationMonths: product.durationMonths,
        price: product.price,
        currency: product.currency,
        features: product.features,
        levelPlan: product.levelPlan,
      },
    });
  }
  console.log(`  · CourseBlock=${COURSE_BLOCKS.length} CourseProduct=${COURSE_PRODUCTS.length}`);
}

async function seedCurator() {
  const passwordHash = await bcrypt.hash(CURATOR.password, BCRYPT_COST);
  await prisma.user.upsert({
    where: { login: CURATOR.login },
    update: { passwordHash, role: "CURATOR", name: CURATOR.name },
    create: { id: CURATOR.id, login: CURATOR.login, passwordHash, role: "CURATOR", name: CURATOR.name },
  });
  console.log("  · Curator=1");
}

async function seedAppSettings() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", previewVideoUrl: null },
  });
}

async function main() {
  console.log("Сидирование (чистый лист)…");
  await seedCatalog();
  await seedCurator();
  await seedAppSettings();
  console.log("Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
