import { Injectable } from "@nestjs/common";
import type { Lang, Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

const TONES = ["var(--tone-1)", "var(--tone-2)", "var(--tone-3)", "var(--tone-4)", "var(--tone-5)"];

@Injectable()
export class TeachersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.teacher.findMany({ orderBy: { name: "asc" } });
  }

  count() {
    return this.prisma.teacher.count();
  }

  findById(id: string) {
    return this.prisma.teacher.findUnique({ where: { id } });
  }

  findGroupsFor(teacherId: string) {
    return this.prisma.group.findMany({
      where: { teacherId, status: { not: "archived" } },
      include: { _count: { select: { students: true } } },
    });
  }

  findIndividualsFor(teacherId: string) {
    return this.prisma.student.findMany({ where: { teacherId, type: "INDIVIDUAL" } });
  }

  countStudentsInGroups(groupIds: string[]) {
    return this.prisma.student.count({ where: { groupId: { in: groupIds } } });
  }

  practicesTodayCount(groupIds: string[], today: Date) {
    if (groupIds.length === 0) return Promise.resolve(0);
    return this.prisma.meeting.count({
      where: { groupId: { in: groupIds }, date: today, status: "scheduled" },
    });
  }

  nextPracticeDate(groupIds: string[], today: Date) {
    if (groupIds.length === 0) return Promise.resolve(null);
    return this.prisma.meeting
      .findFirst({
        where: { groupId: { in: groupIds }, status: "scheduled", date: { gte: today } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        select: { date: true },
      })
      .then((m) => m?.date ?? null);
  }

  async create(data: { name: string; phone: string; languages: Lang[] }) {
    const count = await this.count();
    return this.prisma.teacher.create({
      data: {
        name: data.name,
        phone: data.phone,
        languages: data.languages,
        tone: TONES[count % TONES.length]!,
      },
    });
  }

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return this.prisma.teacher.update({ where: { id }, data });
  }
}
