import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { attentionBuckets, daysLeft, effectiveAccessStatus, todayInTz } from "../../common/domain";
import { CuratorDashboardDto } from "./dto/curator-dashboard.dto";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  private today(): string {
    return todayInTz(this.config.get<string>("school.tz")!);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async get(curatorUserId: string): Promise<CuratorDashboardDto> {
    const today = this.today();
    const todayDate = new Date(`${today}T00:00:00.000Z`);

    const [curator, students, groups, teachersCount, todayMeetings] = await Promise.all([
      this.users.findById(curatorUserId),
      this.prisma.student.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarTone: true,
          status: true,
          endDate: true,
          lastActivity: true,
          onboarded: true,
          startDate: true,
        },
        orderBy: { lastActivity: "asc" },
      }),
      this.prisma.group.findMany({
        select: { id: true, teacherId: true, meetUrl: true, status: true, endDate: true },
      }),
      this.prisma.teacher.count(),
      this.prisma.meeting.findMany({
        where: { date: todayDate, status: "scheduled" },
        include: { group: { select: { name: true } } },
        orderBy: { startTime: "asc" },
      }),
    ]);

    const activeStudents = students.filter(
      (s) =>
        effectiveAccessStatus({ status: s.status, endDate: this.toDateStr(s.endDate) }, today) === "active",
    );
    const liveGroups = groups.filter((g) => g.status === "active" || g.status === "recruiting");
    const newStudents = students.filter((s) => {
      const d = daysLeft(this.toDateStr(s.startDate), today);
      return d >= -3 && d <= 7;
    });

    const buckets = attentionBuckets(
      students.map((s) => ({
        id: s.id,
        status: s.status,
        endDate: this.toDateStr(s.endDate),
        lastActivity: this.toDateStr(s.lastActivity),
        onboarded: s.onboarded,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarTone: s.avatarTone,
      })),
      groups.map((g) => ({
        id: g.id,
        teacherId: g.teacherId,
        meetUrl: g.meetUrl,
        status: g.status,
        endDate: this.toDateStr(g.endDate),
      })),
      today,
    );
    const attentionCount =
      buckets.idleStudents.length +
      buckets.groupsNoTeacher.length +
      buckets.groupsNoLink.length +
      buckets.notOnboarded.length +
      buckets.groupsEndingSoon.length;

    // Тексты не согласуют число грамматически («3 учеников») — воспроизведено как в
    // референсе (curator.index.tsx), это квирк референса, а не TЗ-инвариант.
    const attentionRows = (
      [
        {
          count: buckets.idleStudents.length,
          label: `${buckets.idleStudents.length} учеников не заходили 3+ дня`,
          to: "students" as const,
        },
        {
          count: buckets.groupsNoTeacher.length,
          label: `${buckets.groupsNoTeacher.length} групп без преподавателя`,
          to: "groups" as const,
        },
        {
          count: buckets.groupsNoLink.length,
          label: `${buckets.groupsNoLink.length} групп без ссылки на практику`,
          to: "groups" as const,
        },
        {
          count: buckets.notOnboarded.length,
          label: `${buckets.notOnboarded.length} учеников не завершили onboarding`,
          to: "students" as const,
        },
        {
          count: buckets.groupsEndingSoon.length,
          label: `${buckets.groupsEndingSoon.length} групп скоро заканчиваются`,
          to: "groups" as const,
        },
      ] as const
    ).filter((r) => r.count > 0);

    return {
      curatorName: curator?.name ?? "Куратор",
      today,
      stats: {
        students: students.length,
        active: activeStudents.length,
        groups: liveGroups.length,
        teachers: teachersCount,
      },
      todayPracticeGroupsCount: todayMeetings.length,
      newStudentsCount: newStudents.length,
      attentionCount,
      attentionRows,
      todayMeetings: todayMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: this.toDateStr(m.date),
        startTime: m.startTime,
        endTime: m.endTime,
        meetUrl: m.meetUrl,
        status: m.status,
        groupName: m.group?.name ?? null,
      })),
      idleStudents: buckets.idleStudents.slice(0, 6).map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarTone: s.avatarTone,
        lastActivity: s.lastActivity,
      })),
    };
  }
}
