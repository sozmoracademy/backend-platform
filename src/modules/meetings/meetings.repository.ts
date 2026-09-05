import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRange(dates: Date[] | null, from: Date | null, to: Date | null) {
    const where: Prisma.MeetingWhereInput = dates
      ? { date: { in: dates } }
      : from && to
        ? { date: { gte: from, lte: to } }
        : {};
    return this.prisma.meeting.findMany({
      where,
      include: {
        group: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, firstName: true, lastName: true, teacherId: true } },
        attendance: { select: { studentId: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
  }

  findById(id: string) {
    return this.prisma.meeting.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, firstName: true, lastName: true, teacherId: true } },
        attendance: { select: { studentId: true } },
      },
    });
  }

  findGroupById(id: string) {
    return this.prisma.group.findUnique({ where: { id } });
  }

  findStudentById(id: string) {
    return this.prisma.student.findUnique({ where: { id } });
  }

  findLessonByOrder(order: number) {
    return this.prisma.lesson.findUnique({ where: { order } });
  }

  findGroupRoster(groupId: string) {
    return this.prisma.student.findMany({
      where: { groupId },
      select: { id: true, firstName: true, lastName: true, avatarTone: true },
    });
  }

  createMeeting(data: Prisma.MeetingCreateInput) {
    return this.prisma.meeting.create({
      data,
      include: {
        group: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, firstName: true, lastName: true, teacherId: true } },
        attendance: { select: { studentId: true } },
      },
    });
  }

  update(id: string, data: Prisma.MeetingUpdateInput) {
    return this.prisma.meeting.update({
      where: { id },
      data,
      include: {
        group: { select: { id: true, name: true, teacherId: true } },
        student: { select: { id: true, firstName: true, lastName: true, teacherId: true } },
        attendance: { select: { studentId: true } },
      },
    });
  }

  setAttendance(meetingId: string, studentId: string, present: boolean) {
    if (present) {
      return this.prisma.meetingAttendance.upsert({
        where: { meetingId_studentId: { meetingId, studentId } },
        update: {},
        create: { meetingId, studentId },
      });
    }
    return this.prisma.meetingAttendance.deleteMany({ where: { meetingId, studentId } });
  }

  findTeacherById(id: string) {
    return this.prisma.teacher.findUnique({ where: { id } });
  }
}
