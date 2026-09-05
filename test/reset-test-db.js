// Очищает тестовую БД перед прогоном e2e (BACKEND.md §11 — «отдельная БД,
// чистая перед прогоном»). Не использует `prisma migrate reset` — сам CLI
// отказывается выполнять эту команду от имени AI-агента без явного
// подтверждения пользователя (встроенная защита Prisma). Вместо этого — обычный
// `deleteMany` через Prisma Client, транзакционно, в порядке зависимостей FK;
// действует только на `DATABASE_URL`, переданный этому процессу (тестовая БД
// sozmor_test, см. .env.test — никогда не БД разработки/прод).
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction([
      prisma.meetingAttendance.deleteMany(),
      prisma.testAttempt.deleteMany(),
      prisma.questionOption.deleteMany(),
      prisma.testQuestion.deleteMany(),
      prisma.lessonTest.deleteMany(),
      prisma.meeting.deleteMany(),
      prisma.note.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.studentLesson.deleteMany(),
      prisma.student.deleteMany(),
      prisma.group.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.lesson.deleteMany(),
      prisma.courseProduct.deleteMany(),
      prisma.courseBlock.deleteMany(),
      prisma.appSettings.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
