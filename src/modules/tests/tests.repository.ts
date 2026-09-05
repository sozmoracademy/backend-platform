import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Тест урока — без вопросов, только счётчик (интро-экран). */
  findLightByLessonOrder(order: number, publishedOnly: boolean) {
    return this.prisma.lessonTest.findFirst({
      where: { lessonOrder: order, ...(publishedOnly ? { status: "published" as const } : {}) },
      include: { _count: { select: { questions: true } } },
    });
  }

  /** Тест урока с вопросами и вариантами — нужен для старта попытки/скоринга. */
  findFullByLessonOrder(order: number, publishedOnly: boolean) {
    return this.prisma.lessonTest.findFirst({
      where: { lessonOrder: order, ...(publishedOnly ? { status: "published" as const } : {}) },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
    });
  }

  findFullById(testId: string) {
    return this.prisma.lessonTest.findUnique({
      where: { id: testId },
      include: { questions: { include: { options: true }, orderBy: { order: "asc" } } },
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
    lessonOrder: number;
    studentId: string;
    expiresAt: Date;
    totalQuestions: number;
  }) {
    return this.prisma.testAttempt.create({
      data: {
        testId: data.testId,
        lessonOrder: data.lessonOrder,
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

  findLessonCompletion(studentId: string, lessonOrder: number) {
    return this.prisma.studentLesson.findUnique({
      where: { studentId_lessonOrder: { studentId, lessonOrder } },
    });
  }
}
