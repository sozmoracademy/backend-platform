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

  findLessons(courseProductId: string) {
    return this.prisma.lesson.findMany({ where: { courseProductId }, orderBy: { order: "asc" } });
  }

  findLessonByOrder(courseProductId: string, order: number) {
    return this.prisma.lesson.findUnique({ where: { courseProductId_order: { courseProductId, order } } });
  }

  findTestsWithQuestionCount(courseProductId: string) {
    return this.prisma.lessonTest
      .findMany({
        where: { lesson: { courseProductId } },
        include: { _count: { select: { questions: true } }, lesson: { select: { order: true } } },
      })
      .then((rows) => rows.map((t) => ({ ...t, lessonOrder: t.lesson.order })));
  }

  findStudentLessons(studentId: string) {
    return this.prisma.studentLesson
      .findMany({ where: { studentId }, include: { lesson: { select: { order: true } } } })
      .then((rows) => rows.map((r) => ({ ...r, lessonOrder: r.lesson.order })));
  }

  findStudentLesson(studentId: string, lessonId: string) {
    return this.prisma.studentLesson.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });
  }

  upsertStudentLesson(
    studentId: string,
    lessonId: string,
    data: { watchedPct: number; completedAt: Date | null },
  ) {
    return this.prisma.studentLesson.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      update: data,
      create: { studentId, lessonId, ...data },
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

  findCourseBlocks() {
    return this.prisma.courseBlock.findMany({ orderBy: { month: "asc" } });
  }

  updateLastActivity(studentId: string, today: Date) {
    return this.prisma.student.update({ where: { id: studentId }, data: { lastActivity: today } });
  }

  /** Тестовое видео (TЗ §4.3) — временно подменяет `videoUrl` во всех уроках. */
  async findPreviewVideoUrl(): Promise<string | null> {
    const row = await this.prisma.appSettings.findUnique({ where: { id: "singleton" } });
    return row?.previewVideoUrl ?? null;
  }
}
