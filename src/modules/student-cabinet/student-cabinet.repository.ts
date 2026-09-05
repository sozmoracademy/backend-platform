import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import type { Student } from "@prisma/client";

@Injectable()
export class StudentCabinetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStudentOrThrow(studentId: string) {
    return this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { user: { select: { login: true } } },
    });
  }

  findLessons() {
    return this.prisma.lesson.findMany({ orderBy: { order: "asc" } });
  }

  findLessonByOrder(order: number) {
    return this.prisma.lesson.findUnique({ where: { order } });
  }

  findTestsWithQuestionCount() {
    return this.prisma.lessonTest.findMany({ include: { _count: { select: { questions: true } } } });
  }

  findStudentLessons(studentId: string) {
    return this.prisma.studentLesson.findMany({ where: { studentId } });
  }

  findStudentLesson(studentId: string, lessonOrder: number) {
    return this.prisma.studentLesson.findUnique({
      where: { studentId_lessonOrder: { studentId, lessonOrder } },
    });
  }

  upsertStudentLesson(
    studentId: string,
    lessonOrder: number,
    data: { watchedPct: number; completedAt: Date | null },
  ) {
    return this.prisma.studentLesson.upsert({
      where: { studentId_lessonOrder: { studentId, lessonOrder } },
      update: data,
      create: { studentId, lessonOrder, ...data },
    });
  }

  findAttempts(studentId: string) {
    return this.prisma.testAttempt.findMany({ where: { studentId } });
  }

  /** Встречи ученика: групповые — по группе, индивидуальные — по нему самому (BACKEND.md §7.5). */
  async findMeetings(student: Pick<Student, "id" | "type" | "groupId">) {
    if (student.type === "GROUP") {
      if (!student.groupId) return [];
      return this.prisma.meeting.findMany({
        where: { scope: "GROUP", groupId: student.groupId },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
    }
    return this.prisma.meeting.findMany({
      where: { scope: "INDIVIDUAL", studentId: student.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
  }

  findCourseProduct(language: Student["language"], type: Student["type"]) {
    return this.prisma.courseProduct.findUnique({ where: { language_format: { language, format: type } } });
  }

  findCourseBlocks() {
    return this.prisma.courseBlock.findMany({ orderBy: { month: "asc" } });
  }

  updateLastActivity(studentId: string, today: Date) {
    return this.prisma.student.update({ where: { id: studentId }, data: { lastActivity: today } });
  }
}
