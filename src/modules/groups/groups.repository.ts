import { Injectable } from "@nestjs/common";
import type { GroupStatus, Lang, Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filter: { status?: string; language?: string }) {
    const where: Prisma.GroupWhereInput = {};
    if (filter.status && filter.status !== "all") where.status = filter.status as GroupStatus;
    if (filter.language && filter.language !== "all") where.language = filter.language as Lang;
    return this.prisma.group.findMany({
      where,
      include: { teacher: true, _count: { select: { students: true } } },
      orderBy: { startDate: "asc" },
    });
  }

  countByLanguage(language: Lang) {
    return this.prisma.group.count({ where: { language, status: { not: "archived" } } });
  }

  findAllCodes() {
    return this.prisma.group.findMany({ select: { code: true } }).then((rows) => rows.map((r) => r.code));
  }

  findByIdFull(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { teacher: true, _count: { select: { students: true } } },
    });
  }

  findRoster(groupId: string) {
    return this.prisma.student.findMany({
      where: { groupId },
      include: {
        lessons: { where: { completedAt: { not: null } }, select: { lesson: { select: { order: true } } } },
      },
    });
  }

  findRecentMeetings(groupId: string, take: number) {
    return this.prisma.meeting.findMany({
      where: { groupId },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take,
    });
  }

  create(data: Prisma.GroupCreateInput) {
    return this.prisma.group.create({
      data,
      include: { teacher: true, _count: { select: { students: true } } },
    });
  }

  update(id: string, data: Prisma.GroupUpdateInput) {
    return this.prisma.group.update({
      where: { id },
      data,
      include: { teacher: true, _count: { select: { students: true } } },
    });
  }

  /** Конфликт вечернего слота преподавателя (TЗ инвариант 12, BACKEND.md §7.4). */
  findTeacherSlotConflict(teacherId: string, practiceStart: string, exceptGroupId?: string) {
    return this.prisma.group.findFirst({
      where: {
        teacherId,
        practiceStart,
        status: { in: ["active", "recruiting"] },
        ...(exceptGroupId ? { id: { not: exceptGroupId } } : {}),
      },
    });
  }

  setTeacherForGroupStudents(groupId: string, teacherId: string | null) {
    return this.prisma.student.updateMany({ where: { groupId }, data: { teacherId } });
  }
}
