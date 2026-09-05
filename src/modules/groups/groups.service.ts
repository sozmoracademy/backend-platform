import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Group, Teacher } from "@prisma/client";
import { GroupsRepository } from "./groups.repository";
import {
  currentLessonOrder,
  groupHealth,
  groupNameFor,
  groupStage,
  groupWeekSchedule,
  idleBucketOf,
  nextGroupCode,
  progressPercent,
  todayInTz,
  type LevelPlanEntry,
} from "../../common/domain";
import { effectiveAccessStatus } from "../../common/domain";
import {
  AssignTeacherRequestDto,
  CreateGroupRequestDto,
  GroupDetailDto,
  GroupsListDto,
  GroupSummaryDto,
  GroupsQueryDto,
  UpdateGroupRequestDto,
} from "./dto/group.dto";
import { PrismaService } from "../../infra/prisma/prisma.service";

type GroupWithTeacher = Group & { teacher: Teacher | null; _count: { students: number } };

@Injectable()
export class GroupsService {
  constructor(
    private readonly repo: GroupsRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private today(): string {
    return todayInTz(this.config.get<string>("school.tz")!);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private async levelPlanFor(language: Group["language"]): Promise<LevelPlanEntry[]> {
    const product = await this.prisma.courseProduct.findUnique({
      where: { language_format: { language, format: "GROUP" } },
    });
    return (product?.levelPlan as unknown as LevelPlanEntry[]) ?? [];
  }

  private async toSummary(group: GroupWithTeacher): Promise<GroupSummaryDto> {
    const levelPlan = await this.levelPlanFor(group.language);
    const stage = groupStage(group.currentLesson, levelPlan);
    return {
      id: group.id,
      code: group.code,
      name: group.name,
      language: group.language,
      status: group.status,
      startDate: this.toDateStr(group.startDate),
      endDate: this.toDateStr(group.endDate),
      practiceStart: group.practiceStart,
      practiceEnd: group.practiceEnd,
      studentCount: group._count.students,
      maxStudents: group.maxStudents,
      teacherId: group.teacherId,
      teacherName: group.teacher?.name ?? null,
      teacherTone: group.teacher?.tone ?? null,
      hasMeetUrl: Boolean(group.meetUrl),
      month: stage.month,
      level: stage.level,
      lessonOrder: stage.lesson,
    };
  }

  async list(query: GroupsQueryDto): Promise<GroupsListDto> {
    const rows = await this.repo.findMany({
      status: query.status ?? "all",
      language: query.language ?? "all",
    });
    const items = await Promise.all(rows.map((g) => this.toSummary(g)));
    const [enCount, ruCount] = await Promise.all([
      this.repo.countByLanguage("en"),
      this.repo.countByLanguage("ru"),
    ]);
    return {
      items,
      byLanguage: [
        { code: "en", name: "English", count: enCount },
        { code: "ru", name: "Russian", count: ruCount },
      ],
    };
  }

  async create(body: CreateGroupRequestDto): Promise<GroupSummaryDto> {
    if (body.teacherId) {
      const conflict = await this.repo.findTeacherSlotConflict(body.teacherId, body.practiceStart);
      if (conflict)
        throw new BadRequestException(
          `У преподавателя уже есть группа в ${body.practiceStart}: ${conflict.name}`,
        );
    }
    const codes = await this.repo.findAllCodes();
    const code = nextGroupCode(codes, body.language);
    const name = groupNameFor(code, body.language, body.startDate, body.practiceStart);
    const start = new Date(`${body.startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 6);

    const group = await this.repo.create({
      code,
      name,
      language: body.language,
      startDate: start,
      endDate: end,
      practiceStart: body.practiceStart,
      practiceEnd: body.practiceEnd,
      teacher: body.teacherId ? { connect: { id: body.teacherId } } : undefined,
      maxStudents: body.maxStudents || 50,
      status: "recruiting",
      currentLesson: 1,
    });
    return this.toSummary(group);
  }

  private async loadOrThrow(id: string) {
    const group = await this.repo.findByIdFull(id);
    if (!group) throw new NotFoundException("Группа не найдена");
    return group;
  }

  async summaryById(id: string): Promise<GroupSummaryDto> {
    const group = await this.loadOrThrow(id);
    return this.toSummary(group);
  }

  async detail(id: string): Promise<GroupDetailDto> {
    const group = await this.loadOrThrow(id);
    const summary = await this.toSummary(group);
    const lesson = await this.prisma.lesson.findUnique({ where: { order: group.currentLesson } });

    const today = this.today();
    const roster = await this.repo.findRoster(id);
    const recentMeetings = await this.repo.findRecentMeetings(id, 5);

    return {
      ...summary,
      topic: lesson?.title ?? "—",
      currentLesson: group.currentLesson,
      meetUrl: group.meetUrl,
      health: groupHealth(
        roster.map((s) => this.toDateStr(s.lastActivity)),
        today,
      ),
      weekSchedule: groupWeekSchedule(group.practiceStart, group.practiceEnd),
      recentMeetings: recentMeetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: this.toDateStr(m.date),
        startTime: m.startTime,
        endTime: m.endTime,
        meetUrl: m.meetUrl,
        status: m.status,
      })),
      roster: roster.map((s) => {
        const completedOrders = new Set(s.lessons.map((l) => l.lessonOrder));
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          avatarTone: s.avatarTone,
          currentLessonOrder: currentLessonOrder(s.openedUpTo, completedOrders),
          progressPct: progressPercent(completedOrders.size, 54),
          lastActivity: this.toDateStr(s.lastActivity),
          accessStatus: effectiveAccessStatus(
            { status: s.status, endDate: this.toDateStr(s.endDate) },
            today,
          ),
          idleBucket: idleBucketOf(this.toDateStr(s.lastActivity), today),
        };
      }),
    };
  }

  async update(id: string, body: UpdateGroupRequestDto): Promise<GroupSummaryDto> {
    await this.loadOrThrow(id);
    const group = await this.repo.update(id, {
      status: body.status,
      meetUrl: body.meetUrl,
      maxStudents: body.maxStudents,
    });
    return this.toSummary(group);
  }

  async assignTeacher(id: string, body: AssignTeacherRequestDto): Promise<GroupSummaryDto> {
    const current = await this.loadOrThrow(id);
    if (body.teacherId) {
      const conflict = await this.repo.findTeacherSlotConflict(body.teacherId, current.practiceStart, id);
      if (conflict)
        throw new BadRequestException(
          `Нельзя назначить: в ${current.practiceStart} у преподавателя уже «${conflict.name}»`,
        );
    }
    const group = await this.repo.update(id, {
      teacher: body.teacherId ? { connect: { id: body.teacherId } } : { disconnect: true },
    });
    await this.repo.setTeacherForGroupStudents(id, body.teacherId);
    return this.toSummary(group);
  }
}
