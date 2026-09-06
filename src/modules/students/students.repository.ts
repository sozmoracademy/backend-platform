import { Injectable } from "@nestjs/common";
import type { AccessStatus, CourseType, Lang, Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

export const PAGE_SIZE = 20;

export interface StudentsFilter {
  q?: string;
  language?: string;
  type?: string;
  status?: string;
  groupId?: string;
  teacherId?: string;
}

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** По эффективному статусу доступа (BACKEND.md §6, `effectiveAccessStatus`), не по сырому полю. */
  private accessStatusWhere(status: string, today: Date): Prisma.StudentWhereInput | undefined {
    if (status === "disabled") return { status: "disabled" };
    if (status === "expired")
      return { OR: [{ status: "expired" }, { status: "active", endDate: { lt: today } }] };
    if (status === "active") return { status: "active", endDate: { gte: today } };
    return undefined;
  }

  private buildWhere(filter: StudentsFilter, today: Date): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {};
    if (filter.language && filter.language !== "all") where.language = filter.language as Lang;
    if (filter.type && filter.type !== "all") where.type = filter.type as CourseType;
    if (filter.groupId && filter.groupId !== "all") where.groupId = filter.groupId;
    if (filter.teacherId && filter.teacherId !== "all") where.teacherId = filter.teacherId;
    if (filter.status && filter.status !== "all") {
      const accessWhere = this.accessStatusWhere(filter.status, today);
      if (accessWhere) Object.assign(where, accessWhere);
    }
    if (filter.q?.trim()) {
      const q = filter.q.trim();
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { user: { login: { contains: q, mode: "insensitive" } } },
      ];
    }
    return where;
  }

  async findPage(filter: StudentsFilter, page: number, today: Date) {
    const where = this.buildWhere(filter, today);
    const [items, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          user: { select: { login: true } },
          group: { select: { code: true, name: true, courseProductId: true } },
          payment: true,
          lessons: {
            where: { completedAt: { not: null } },
            select: { lesson: { select: { order: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.student.count({ where }),
    ]);
    return { items, total };
  }

  findByIdFull(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { login: true, passwordEnc: true } },
        group: true,
        teacher: true,
        payment: true,
      },
    });
  }

  findCompletedOrders(studentId: string) {
    return this.prisma.studentLesson
      .findMany({
        where: { studentId, completedAt: { not: null } },
        select: { lesson: { select: { order: true } } },
      })
      .then((rows) => rows.map((r) => ({ lessonOrder: r.lesson.order })));
  }

  findMeetingsFor(student: { id: string; type: CourseType; groupId: string | null }) {
    if (student.type === "GROUP") {
      if (!student.groupId) return Promise.resolve([]);
      return this.prisma.meeting.findMany({
        where: { scope: "GROUP", groupId: student.groupId },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: { attendance: { select: { studentId: true } } },
      });
    }
    return this.prisma.meeting.findMany({
      where: { scope: "INDIVIDUAL", studentId: student.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { attendance: { select: { studentId: true } } },
    });
  }

  findTestsWithQuestionCount(courseProductId: string) {
    return this.prisma.lessonTest
      .findMany({
        where: { lesson: { courseProductId } },
        include: { _count: { select: { questions: true } }, lesson: { select: { order: true } } },
      })
      .then((rows) => rows.map((t) => ({ ...t, lessonOrder: t.lesson.order })));
  }

  findAttemptsForStudent(studentId: string) {
    return this.prisma.testAttempt.findMany({ where: { studentId } });
  }

  loginExists(login: string) {
    return this.prisma.user.count({ where: { login } }).then((n) => n > 0);
  }

  findAllLessonsLight(courseProductId: string) {
    return this.prisma.lesson.findMany({
      where: { courseProductId },
      orderBy: { order: "asc" },
      select: { order: true, title: true },
    });
  }

  findMatchingGroupCandidates(language: Lang, fromDate: Date) {
    return this.prisma.group.findMany({
      where: { language, status: "recruiting", startDate: { gte: fromDate } },
      include: { _count: { select: { students: true } } },
      orderBy: { startDate: "asc" },
    });
  }

  findGroupById(id: string) {
    return this.prisma.group.findUnique({ where: { id } });
  }

  createStudent(data: Prisma.StudentCreateInput) {
    return this.prisma.student.create({ data, include: { user: { select: { login: true } } } });
  }

  createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  updateUserCredentials(userId: string, data: { passwordHash: string; passwordEnc: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  createPayment(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }

  updateContact(
    id: string,
    data: { phone?: string; city?: string; age?: number | null; managerName?: string; onboarded?: boolean },
  ) {
    return this.prisma.student.update({ where: { id }, data });
  }

  updatePayment(studentId: string, data: { totalCost: number; paid: number }) {
    return this.prisma.payment.update({ where: { studentId }, data });
  }

  updateAccess(id: string, data: { status?: AccessStatus; endDate?: Date }) {
    return this.prisma.student.update({ where: { id }, data });
  }

  updateGroupAssignment(
    id: string,
    data: { groupId: string | null; teacherId?: string | null; startDate?: Date; endDate?: Date },
  ) {
    return this.prisma.student.update({ where: { id }, data });
  }

  updateOpenedUpTo(id: string, openedUpTo: number) {
    return this.prisma.student.update({ where: { id }, data: { openedUpTo } });
  }

  async bulkUpdate(
    ids: string[],
    patch: { groupId?: string | null; teacherId?: string | null; status?: AccessStatus },
  ) {
    if (patch.groupId !== undefined) {
      const group = patch.groupId ? await this.findGroupById(patch.groupId) : null;
      await this.prisma.student.updateMany({
        where: { id: { in: ids } },
        data: { groupId: patch.groupId, teacherId: group?.teacherId ?? null },
      });
    } else if (patch.teacherId !== undefined) {
      await this.prisma.student.updateMany({
        where: { id: { in: ids } },
        data: { teacherId: patch.teacherId },
      });
    }
    if (patch.status !== undefined) {
      await this.prisma.student.updateMany({ where: { id: { in: ids } }, data: { status: patch.status } });
    }
  }

  findAllForExport(filter: StudentsFilter, ids: string[] | undefined, today: Date) {
    const where = ids?.length ? { id: { in: ids } } : this.buildWhere(filter, today);
    return this.prisma.student.findMany({
      where,
      include: { user: { select: { login: true } }, group: { select: { code: true } }, payment: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
