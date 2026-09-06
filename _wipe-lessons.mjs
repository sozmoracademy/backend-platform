// Одноразовый скрипт: удаляет ВСЕ уроки и зависимые от них строки
// (тесты, вопросы, попытки, встречи, прогресс). НЕ трогает продукты, блоки,
// студентов, группы, преподавателей, куратора.
//   cd backend && DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" node _wipe-lessons.mjs
// После — удалить этот файл.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

console.log("BEFORE:", {
  lessons: await prisma.lesson.count(),
  studentLessons: await prisma.studentLesson.count(),
  tests: await prisma.lessonTest.count(),
  attempts: await prisma.testAttempt.count(),
  meetings: await prisma.meeting.count(),
});

const r = {};
r.attempts = (await prisma.testAttempt.deleteMany({})).count;
r.studentLessons = (await prisma.studentLesson.deleteMany({})).count;
r.attendance = (await prisma.meetingAttendance.deleteMany({})).count;
r.meetings = (await prisma.meeting.deleteMany({})).count;
r.options = (await prisma.questionOption.deleteMany({})).count;
r.questions = (await prisma.testQuestion.deleteMany({})).count;
r.tests = (await prisma.lessonTest.deleteMany({})).count;
r.lessons = (await prisma.lesson.deleteMany({})).count;
console.log("DELETED:", r);

console.log("AFTER (сохранено):", {
  lessons: await prisma.lesson.count(),
  students: await prisma.student.count(),
  groups: await prisma.group.count(),
  teachers: await prisma.teacher.count(),
  products: await prisma.courseProduct.count(),
  blocks: await prisma.courseBlock.count(),
});

await prisma.$disconnect();
