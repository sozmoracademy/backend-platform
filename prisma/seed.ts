/**
 * Идемпотентный сид (BACKEND.md §13) — данные скопированы из
 * `english-flow/src/lib/mock-data.ts` (`prisma/seed-data/*`). Все входящие даты
 * абсолютны и привязаны к `REFERENCE_TODAY` ("2026-08-18", как в референсе);
 * скрипт сдвигает их на разницу с `SEED_TODAY` (env), чтобы демо-данные
 * («сегодня», «на этой неделе», «требует внимания») оставались согласованы
 * при смене опорной даты. По умолчанию `SEED_TODAY === REFERENCE_TODAY` → сдвиг 0.
 */
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Lang, type CourseType as PrismaCourseType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { COURSE_BLOCKS, COURSE_PRODUCTS, LESSONS, lessonIdKey, productIdFor } from "./seed-data/curriculum";
import {
  CURATOR,
  GROUPS,
  MEETINGS,
  NOTES,
  REFERENCE_TODAY,
  STUDENTS,
  TEACHERS,
  TESTS,
} from "./seed-data/academy";

// Prisma 7 не читает `.env` сам и требует driver adapter в конструкторе.
// `dotenv` не переопределяет уже выставленные переменные — прогон из
// test/global-setup.js (DATABASE_URL от .env.test) не затрагивается.
loadEnv({ path: join(__dirname, "..", ".env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const BCRYPT_COST = 12;

const seedToday = process.env.SEED_TODAY ?? REFERENCE_TODAY;
const OFFSET_DAYS = Math.round(
  (new Date(`${seedToday}T00:00:00Z`).getTime() - new Date(`${REFERENCE_TODAY}T00:00:00Z`).getTime()) /
    86_400_000,
);

function shiftDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + OFFSET_DAYS);
  return d;
}

/** courseProductId#order -> Lesson.id, заполняется в seedCurriculum(), используется всеми остальными шагами. */
const lessonIdByKey = new Map<string, string>();

function lessonId(courseProductId: string, order: number): string {
  const id = lessonIdByKey.get(lessonIdKey(courseProductId, order));
  if (!id) throw new Error(`Не найден Lesson для courseProductId=${courseProductId} order=${order}`);
  return id;
}

/** Резолвит courseProductId ученика: GROUP — через его группу, INDIVIDUAL — язык+формат. */
function studentProductId(student: { language: string; type: string; groupId: string | null }): string {
  if (student.type === "INDIVIDUAL") {
    return productIdFor(student.language as "en" | "ru", "INDIVIDUAL", 1);
  }
  const group = GROUPS.find((g) => g.id === student.groupId);
  if (!group) throw new Error(`Не найдена группа ${student.groupId} для студента`);
  return group.courseProductId;
}

async function seedCurriculum() {
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

  for (const lesson of LESSONS) {
    const row = await prisma.lesson.upsert({
      where: { courseProductId_order: { courseProductId: lesson.courseProductId, order: lesson.order } },
      update: {
        title: lesson.title,
        description: lesson.description,
        block: lesson.block,
        videoUrl: lesson.videoUrl,
        duration: lesson.duration,
      },
      create: {
        courseProductId: lesson.courseProductId,
        order: lesson.order,
        title: lesson.title,
        description: lesson.description,
        block: lesson.block,
        videoUrl: lesson.videoUrl,
        duration: lesson.duration,
      },
    });
    lessonIdByKey.set(lessonIdKey(lesson.courseProductId, lesson.order), row.id);
  }
  console.log(
    `  · CourseBlock=${COURSE_BLOCKS.length} CourseProduct=${COURSE_PRODUCTS.length} Lesson=${LESSONS.length}`,
  );
}

async function seedTeachers() {
  for (const teacher of TEACHERS) {
    await prisma.teacher.upsert({
      where: { id: teacher.id },
      update: {
        name: teacher.name,
        languages: teacher.languages as Lang[],
        status: teacher.status,
        phone: teacher.phone,
        tone: teacher.tone,
      },
      create: {
        id: teacher.id,
        name: teacher.name,
        languages: teacher.languages as Lang[],
        status: teacher.status,
        phone: teacher.phone,
        tone: teacher.tone,
      },
    });
  }
  console.log(`  · Teacher=${TEACHERS.length}`);
}

async function seedGroups() {
  for (const group of GROUPS) {
    await prisma.group.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        language: group.language as Lang,
        courseProductId: group.courseProductId,
        startDate: shiftDate(group.startDate),
        endDate: shiftDate(group.endDate),
        practiceStart: group.practiceStart,
        practiceEnd: group.practiceEnd,
        teacherId: group.teacherId,
        maxStudents: group.maxStudents,
        status: group.status,
        currentLesson: group.currentLesson,
        meetUrl: group.meetUrl,
      },
      create: {
        id: group.id,
        code: group.code,
        name: group.name,
        language: group.language as Lang,
        courseProductId: group.courseProductId,
        startDate: shiftDate(group.startDate),
        endDate: shiftDate(group.endDate),
        practiceStart: group.practiceStart,
        practiceEnd: group.practiceEnd,
        teacherId: group.teacherId,
        maxStudents: group.maxStudents,
        status: group.status,
        currentLesson: group.currentLesson,
        meetUrl: group.meetUrl,
      },
    });
  }
  console.log(`  · Group=${GROUPS.length}`);
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

async function seedStudents() {
  for (const student of STUDENTS) {
    const passwordHash = await bcrypt.hash(student.password, BCRYPT_COST);
    const user = await prisma.user.upsert({
      where: { login: student.login },
      update: { passwordHash, role: "STUDENT" },
      create: { login: student.login, passwordHash, role: "STUDENT" },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        language: student.language as Lang,
        type: student.type,
        age: student.age,
        city: student.city,
        groupId: student.groupId,
        teacherId: student.teacherId,
        startDate: shiftDate(student.startDate),
        endDate: shiftDate(student.endDate),
        status: student.status,
        openedUpTo: student.openedUpTo,
        onboarded: student.onboarded,
        managerName: student.managerName,
        avatarTone: student.avatarTone,
        lastActivity: shiftDate(student.lastActivity),
      },
      create: {
        id: student.id,
        userId: user.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        language: student.language as Lang,
        type: student.type,
        age: student.age,
        city: student.city,
        groupId: student.groupId,
        teacherId: student.teacherId,
        startDate: shiftDate(student.startDate),
        endDate: shiftDate(student.endDate),
        status: student.status,
        openedUpTo: student.openedUpTo,
        onboarded: student.onboarded,
        managerName: student.managerName,
        avatarTone: student.avatarTone,
        lastActivity: shiftDate(student.lastActivity),
      },
    });

    await prisma.payment.upsert({
      where: { studentId: student.id },
      update: {
        totalCost: student.payment.totalCost,
        paid: student.payment.paid,
        purchaseDate: shiftDate(student.payment.purchaseDate),
      },
      create: {
        studentId: student.id,
        totalCost: student.payment.totalCost,
        paid: student.payment.paid,
        purchaseDate: shiftDate(student.payment.purchaseDate),
      },
    });

    const productId = studentProductId(student);
    const watchedOrders = new Set([...student.completed, ...Object.keys(student.watched).map(Number)]);
    for (const order of watchedOrders) {
      const completedAtIso = student.completedAt[order];
      const isCompleted = student.completed.includes(order);
      const lid = lessonId(productId, order);
      await prisma.studentLesson.upsert({
        where: { studentId_lessonId: { studentId: student.id, lessonId: lid } },
        update: {
          watchedPct: isCompleted ? 100 : (student.watched[order] ?? 0),
          completedAt: isCompleted ? shiftDate(completedAtIso ?? student.startDate) : null,
        },
        create: {
          studentId: student.id,
          lessonId: lid,
          watchedPct: isCompleted ? 100 : (student.watched[order] ?? 0),
          completedAt: isCompleted ? shiftDate(completedAtIso ?? student.startDate) : null,
        },
      });
    }
  }
  console.log(`  · Student=${STUDENTS.length} (+ User, Payment, StudentLesson)`);
}

async function seedMeetings() {
  for (const meeting of MEETINGS) {
    const lid = lessonId(meeting.courseProductId, meeting.lessonOrder);
    await prisma.meeting.upsert({
      where: { id: meeting.id },
      update: {
        lessonId: lid,
        scope: meeting.scope,
        groupId: meeting.groupId,
        studentId: meeting.studentId,
        title: meeting.title,
        date: shiftDate(meeting.date),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        meetUrl: meeting.meetUrl,
        status: meeting.status,
      },
      create: {
        id: meeting.id,
        lessonId: lid,
        scope: meeting.scope,
        groupId: meeting.groupId,
        studentId: meeting.studentId,
        title: meeting.title,
        date: shiftDate(meeting.date),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        meetUrl: meeting.meetUrl,
        status: meeting.status,
      },
    });

    for (const studentId of meeting.attended ?? []) {
      await prisma.meetingAttendance.upsert({
        where: { meetingId_studentId: { meetingId: meeting.id, studentId } },
        update: {},
        create: { meetingId: meeting.id, studentId },
      });
    }
  }
  console.log(`  · Meeting=${MEETINGS.length}`);
}

async function seedTests() {
  for (const test of TESTS) {
    const lid = lessonId(test.courseProductId, test.lessonOrder);
    const dbTest = await prisma.lessonTest.upsert({
      where: { lessonId: lid },
      update: {
        title: test.title,
        timeLimitSec: test.timeLimitSec,
        passingScore: test.passingScore,
        status: test.status,
      },
      create: {
        id: test.id,
        lessonId: lid,
        title: test.title,
        timeLimitSec: test.timeLimitSec,
        passingScore: test.passingScore,
        status: test.status,
      },
    });

    for (const question of test.questions) {
      const existing = await prisma.testQuestion.findUnique({ where: { id: question.id } });
      if (existing) {
        await prisma.testQuestion.update({
          where: { id: question.id },
          data: { text: question.text, type: question.type, order: question.order },
        });
      } else {
        await prisma.testQuestion.create({
          data: {
            id: question.id,
            testId: dbTest.id,
            text: question.text,
            type: question.type,
            order: question.order,
          },
        });
      }

      for (const option of question.options) {
        await prisma.questionOption.upsert({
          where: { id: option.id },
          update: { text: option.text, isCorrect: option.isCorrect },
          create: { id: option.id, questionId: question.id, text: option.text, isCorrect: option.isCorrect },
        });
      }
    }
  }
  console.log(`  · LessonTest=${TESTS.length}`);
}

/**
 * Сданная попытка теста урока 1 у Каната (s1) — благодаря ей его урок 3 открыт
 * под тест-гейтом (ТЗ инвариант 4). У Алины (s2) попытки нет: она завершила
 * уроки, но следующий закрыт до сдачи теста 1 — демо самого гейта.
 */
async function seedAttempts() {
  const test = TESTS[0];
  if (!test) return;
  const lid = lessonId(test.courseProductId, test.lessonOrder);
  const id = "attempt-s1-test1";
  const data = {
    testId: test.id,
    lessonId: lid,
    studentId: "s1",
    startedAt: shiftDate("2026-08-19"),
    expiresAt: shiftDate("2026-08-19"),
    submittedAt: shiftDate("2026-08-19"),
    answers: {},
    correctCount: 7,
    totalQuestions: test.questions.length,
    score: 88,
    passed: true,
    status: "submitted" as const,
  };
  await prisma.testAttempt.upsert({ where: { id }, update: data, create: { id, ...data } });
  console.log(`  · TestAttempt=1`);
}

async function seedNotes() {
  for (const note of NOTES) {
    await prisma.note.upsert({
      where: { id: note.id },
      update: { content: note.content, author: note.author },
      create: {
        id: note.id,
        studentId: note.studentId,
        authorId: CURATOR.id,
        author: note.author,
        content: note.content,
        createdAt: shiftDate(note.createdAt),
      },
    });
  }
  console.log(`  · Note=${NOTES.length}`);
}

async function seedAppSettings() {
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", previewVideoUrl: null },
  });
}

async function main() {
  console.log(`Сидирование (SEED_TODAY=${seedToday}, сдвиг=${OFFSET_DAYS}д)…`);
  await seedCurriculum();
  await seedTeachers();
  await seedGroups();
  await seedCurator();
  await seedStudents();
  await seedMeetings();
  await seedTests();
  await seedAttempts();
  await seedNotes();
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
