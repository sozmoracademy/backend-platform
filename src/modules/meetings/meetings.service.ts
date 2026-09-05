import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Meeting } from "@prisma/client";
import { MeetingsRepository } from "./meetings.repository";
import {
  currentLessonOrder,
  groupStage,
  shiftWeek,
  todayInTz,
  weekRange,
  type LevelPlanEntry,
} from "../../common/domain";
import { PrismaService } from "../../infra/prisma/prisma.service";
import {
  CreateMeetingRequestDto,
  MarkAttendanceRequestDto,
  MeetingsQueryDto,
  ScheduleMeetingDto,
  UpdateMeetingRequestDto,
} from "./dto/meeting.dto";

type MeetingFull = Meeting & {
  group: { id: string; name: string; teacherId: string | null } | null;
  student: { id: string; firstName: string; lastName: string; teacherId: string | null } | null;
  attendance: { studentId: string }[];
};

@Injectable()
export class MeetingsService {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private today(): string {
    return todayInTz(this.config.get<string>("school.tz")!);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private toDate(iso: string): Date {
    return new Date(`${iso}T00:00:00.000Z`);
  }

  private async toDto(m: MeetingFull): Promise<ScheduleMeetingDto> {
    const teacherId = m.group?.teacherId ?? m.student?.teacherId ?? null;
    const teacher = teacherId ? await this.repo.findTeacherById(teacherId) : null;
    let roster: ScheduleMeetingDto["roster"] = [];
    const attended = new Set(m.attendance.map((a) => a.studentId));
    if (m.scope === "GROUP" && m.groupId) {
      const students = await this.repo.findGroupRoster(m.groupId);
      roster = students.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarTone: s.avatarTone,
        present: attended.has(s.id),
      }));
    } else if (m.student) {
      roster = [
        {
          id: m.student.id,
          firstName: m.student.firstName,
          lastName: m.student.lastName,
          avatarTone: "",
          present: attended.has(m.student.id),
        },
      ];
    }

    return {
      id: m.id,
      lessonOrder: m.lessonOrder,
      scope: m.scope,
      groupId: m.groupId,
      groupName: m.group?.name ?? null,
      studentId: m.scope === "INDIVIDUAL" ? m.studentId : null,
      studentName: m.student ? `${m.student.firstName} ${m.student.lastName}` : null,
      title: m.title,
      date: this.toDateStr(m.date),
      startTime: m.startTime,
      endTime: m.endTime,
      meetUrl: m.meetUrl,
      status: m.status,
      teacherName: teacher?.name ?? null,
      roster,
    };
  }

  async list(query: MeetingsQueryDto): Promise<ScheduleMeetingDto[]> {
    const today = this.today();
    let dates: string[] | null = null;
    if (!query.from || !query.to) {
      const range = query.range ?? "today";
      if (range === "today") dates = [today];
      else if (range === "week") dates = weekRange(today);
      else dates = weekRange(shiftWeek(today, 1));
    }
    const rows = await this.repo.findByRange(
      dates ? dates.map((d) => this.toDate(d)) : null,
      query.from ? this.toDate(query.from) : null,
      query.to ? this.toDate(query.to) : null,
    );
    return Promise.all(rows.map((m) => this.toDto(m)));
  }

  private async levelPlanFor(language: "en" | "ru"): Promise<LevelPlanEntry[]> {
    const product = await this.prisma.courseProduct.findUnique({
      where: { language_format: { language, format: "GROUP" } },
    });
    return (product?.levelPlan as unknown as LevelPlanEntry[]) ?? [];
  }

  async create(body: CreateMeetingRequestDto): Promise<ScheduleMeetingDto> {
    if (body.scope === "GROUP") {
      const group = body.groupId ? await this.repo.findGroupById(body.groupId) : null;
      if (!group) throw new BadRequestException("Выберите группу");
      const meetUrl = body.meetUrl || group.meetUrl;
      if (!meetUrl) throw new BadRequestException("Добавьте ссылку Google Meet (в группе или в форме)");

      const levelPlan = await this.levelPlanFor(group.language);
      const stage = groupStage(group.currentLesson, levelPlan);
      const lesson = await this.repo.findLessonByOrder(group.currentLesson);
      const [h, min] = group.practiceStart.split(":");
      const endTime =
        body.endTime || group.practiceEnd || `${String((Number(h) + 1) % 24).padStart(2, "0")}:${min}`;

      const meeting = await this.repo.createMeeting({
        lesson: { connect: { order: group.currentLesson } },
        scope: "GROUP",
        group: { connect: { id: group.id } },
        title: `Практика: ${lesson?.title ?? stage.lesson}`,
        date: this.toDate(body.date),
        startTime: body.startTime || group.practiceStart,
        endTime,
        meetUrl,
        status: "scheduled",
      });
      return this.toDto(meeting);
    }

    const student = body.studentId ? await this.repo.findStudentById(body.studentId) : null;
    if (!student) throw new BadRequestException("Выберите ученика");
    if (!body.startTime || !body.endTime) throw new BadRequestException("Укажите время практики");
    if (!body.meetUrl) throw new BadRequestException("Добавьте ссылку Google Meet");

    const completed = await this.prisma.studentLesson.findMany({
      where: { studentId: student.id, completedAt: { not: null } },
      select: { lessonOrder: true },
    });
    const order = currentLessonOrder(student.openedUpTo, new Set(completed.map((c) => c.lessonOrder)));
    const lesson = await this.repo.findLessonByOrder(order);

    const meeting = await this.repo.createMeeting({
      lesson: { connect: { order } },
      scope: "INDIVIDUAL",
      student: { connect: { id: student.id } },
      title: `Индивидуальная практика: ${lesson?.title ?? `Lesson ${order}`}`,
      date: this.toDate(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      meetUrl: body.meetUrl,
      status: "scheduled",
    });
    return this.toDto(meeting);
  }

  async update(id: string, body: UpdateMeetingRequestDto): Promise<ScheduleMeetingDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException("Практика не найдена");
    const meeting = await this.repo.update(id, {
      status: body.status,
      date: body.date ? this.toDate(body.date) : undefined,
      meetUrl: body.meetUrl,
    });
    return this.toDto(meeting);
  }

  async markAttendance(id: string, body: MarkAttendanceRequestDto): Promise<ScheduleMeetingDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException("Практика не найдена");
    await this.repo.setAttendance(id, body.studentId, body.present);
    const meeting = await this.repo.findById(id);
    return this.toDto(meeting!);
  }
}
