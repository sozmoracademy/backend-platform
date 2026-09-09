import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Тест урока — без вопросов, только счётчик (интро-экран). */
  findLightByLessonOrder(courseProductId: string, order: number, publishedOnly: boolean) {
    return this.prisma.lessonTest.findFirst({
      where: {
        lesson: { courseProductId, order },
        ...(publishedOnly ? { status: "published" as const } : {}),
      },
      include: { _count: { select: { questions: true } }, lesson: { select: { id: true, order: true } } },
    });
  }

  /** Тест урока с вопросами и вариантами — нужен для старта попытки/скоринга. */
  findFullByLessonOrder(courseProductId: string, order: number, publishedOnly: boolean) {
    return this.prisma.lessonTest.findFirst({
      where: {
        lesson: { courseProductId, order },
        ...(publishedOnly ? { status: "published" as const } : {}),
      },
      include: {
        questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
        lesson: { select: { id: true, order: true } },
      },
    });
  }

  findFullById(testId: string) {
    return this.prisma.lessonTest.findUnique({
      where: { id: testId },
      include: {
        questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
        lesson: { select: { id: true, order: true } },
      },
    });
  }

  findAttemptsForTest(studentId: string, testId: string) {
    return this.prisma.testAttempt.findMany({ where: { studentId, testId } });
  }

  findAttemptById(id: string) {
    return this.prisma.testAttempt.findUnique({ where: { id } });
  }

  createAttempt(data: {
    testId: string;
    lessonId: string;
    studentId: string;
    expiresAt: Date;
    totalQuestions: number;
  }) {
    return this.prisma.testAttempt.create({
      data: {
        testId: data.testId,
        lessonId: data.lessonId,
        studentId: data.studentId,
        expiresAt: data.expiresAt,
        totalQuestions: data.totalQuestions,
      },
    });
  }

  updateAnswers(id: string, answers: Record<string, string[]>) {
    return this.prisma.testAttempt.update({ where: { id }, data: { answers } });
  }

  submitAttempt(
    id: string,
    result: { correctCount: number; totalQuestions: number; score: number; passed: boolean },
  ) {
    return this.prisma.testAttempt.update({
      where: { id },
      data: { ...result, submittedAt: new Date(), status: "submitted" },
    });
  }

  findStudentAccessInfo(studentId: string) {
    return this.prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  }

  findLessonCompletion(studentId: string, lessonId: string) {
    return this.prisma.studentLesson.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
  }

  /* ---------- редактор теста (роль curator) ---------- */

  findLessonById(lessonId: string) {
    return this.prisma.lesson.findUnique({ where: { id: lessonId } });
  }

  findFullByLessonId(lessonId: string) {
    return this.prisma.lessonTest.findFirst({
      where: { lessonId },
      include: {
        questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
        lesson: { select: { id: true, order: true } },
      },
    });
  }

  /**
   * Все тесты всех продуктов с >= 1 вопросом — каталог доноров для «взять тест из
   * другого курса» (`features/copy-lesson-test` во фронте). Пустой тест копировать
   * нечего. Порядок: короткие курсы → длинные, внутри — по номеру урока.
   */
  findAllTestsForLibrary() {
    return this.prisma.lessonTest.findMany({
      where: { questions: { some: {} } },
      include: {
        _count: { select: { questions: true } },
        lesson: { include: { courseProduct: true } },
      },
      orderBy: [{ lesson: { courseProduct: { durationMonths: "asc" } } }, { lesson: { order: "asc" } }],
    });
  }

  createTest(data: { lessonId: string; title: string }) {
    return this.prisma.lessonTest.create({
      data: { lessonId: data.lessonId, title: data.title },
      include: { questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } } },
    });
  }

  updateTest(
    id: string,
    data: { title?: string; timeLimitSec?: number; passingScore?: number; status?: "draft" | "published" },
  ) {
    return this.prisma.lessonTest.update({
      where: { id },
      data,
      include: {
        questions: { include: { options: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
        lesson: { select: { id: true, order: true } },
      },
    });
  }

  /**
   * Заменить содержимое теста содержимым другого теста (копия «взять тест из
   * другого курса»). В одной транзакции: снести все вопросы целевого теста
   * (варианты уходят каскадом), перенести время/проходной балл, создать вопросы и
   * варианты заново. Статус теста и его привязку к уроку не трогаем.
   */
  replaceTestContent(
    testId: string,
    data: {
      timeLimitSec: number;
      passingScore: number;
      questions: {
        text: string;
        type: "single" | "multiple";
        order: number;
        options: { text: string; isCorrect: boolean }[];
      }[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.testQuestion.deleteMany({ where: { testId } });
      await tx.lessonTest.update({
        where: { id: testId },
        data: { timeLimitSec: data.timeLimitSec, passingScore: data.passingScore },
      });
      for (const q of data.questions) {
        await tx.testQuestion.create({
          data: {
            testId,
            text: q.text,
            type: q.type,
            order: q.order,
            options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) },
          },
        });
      }
    });
  }

  deleteTest(id: string) {
    return this.prisma.lessonTest.delete({ where: { id } });
  }

  createQuestion(testId: string, order: number) {
    return this.prisma.testQuestion.create({
      data: {
        testId,
        order,
        type: "single",
        options: { create: [0, 1, 2, 3].map((i) => ({ text: "", isCorrect: i === 0 })) },
      },
    });
  }

  findQuestionById(id: string) {
    return this.prisma.testQuestion.findUnique({ where: { id }, include: { options: true } });
  }

  updateQuestion(id: string, data: { text?: string; type?: "single" | "multiple" }) {
    return this.prisma.testQuestion.update({ where: { id }, data });
  }

  deleteQuestion(id: string) {
    return this.prisma.testQuestion.delete({ where: { id } });
  }

  findRemainingQuestionsOrdered(testId: string) {
    return this.prisma.testQuestion.findMany({ where: { testId }, orderBy: { order: "asc" } });
  }

  reorderQuestion(id: string, order: number) {
    return this.prisma.testQuestion.update({ where: { id }, data: { order } });
  }

  findOptionById(id: string) {
    return this.prisma.questionOption.findUnique({
      where: { id },
      include: { question: { include: { options: true } } },
    });
  }

  updateOption(id: string, data: { text?: string; isCorrect?: boolean }) {
    return this.prisma.questionOption.update({ where: { id }, data });
  }

  exclusivifyOptions(questionId: string, exceptOptionId: string) {
    return this.prisma.questionOption.updateMany({
      where: { questionId, id: { not: exceptOptionId } },
      data: { isCorrect: false },
    });
  }
}
