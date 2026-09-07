import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Teacher } from "@prisma/client";
import { TeachersRepository } from "./teachers.repository";
import { groupStage, todayInTz, type LevelPlanEntry } from "../../common/domain";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CourseResolverService } from "../courses/course-resolver.service";
import {
  CreateTeacherRequestDto,
  TeacherDetailDto,
  TeacherListItemDto,
  TeachersListDto,
  UpdateTeacherRequestDto,
} from "./dto/teacher.dto";

@Injectable()
export class TeachersService {
  constructor(
    private readonly repo: TeachersRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resolver: CourseResolverService,
  ) {}

  private today(): Date {
    return new Date(`${todayInTz(this.config.get<string>("school.tz")!)}T00:00:00.000Z`);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private async listItem(teacher: Teacher): Promise<TeacherListItemDto> {
    const groups = await this.repo.findGroupsFor(teacher.id);
    const groupIds = groups.map((g) => g.id);
    const groupStudents = groups.reduce((sum, g) => sum + g._count.students, 0);
    const individuals = await this.repo.findIndividualsFor(teacher.id);
    const nextPractice = await this.repo.nextPracticeDate(groupIds, this.today());
    return {
      id: teacher.id,
      name: teacher.name,
      languages: teacher.languages,
      status: teacher.status,
      phone: teacher.phone,
      tone: teacher.tone,
      groupsCount: groups.length,
      studentsCount: groupStudents + individuals.length,
      nextPracticeDate: nextPractice ? this.toDateStr(nextPractice) : null,
    };
  }

  async list(): Promise<TeachersListDto> {
    const teachers = await this.repo.findAll();
    const items = await Promise.all(teachers.map((t) => this.listItem(t)));
    const today = this.today();
    const practicesToday = await this.prisma.meeting.count({ where: { date: today, status: "scheduled" } });
    return {
      items,
      summary: {
        active: teachers.filter((t) => t.status === "active").length,
        absent: teachers.filter((t) => t.status === "absent").length,
        replacement: teachers.filter((t) => t.status === "replacement").length,
        practicesToday,
      },
    };
  }

  async create(body: CreateTeacherRequestDto): Promise<TeacherListItemDto> {
    const teacher = await this.repo.create({
      name: body.name.trim(),
      phone: body.phone,
      languages: body.languages.length > 0 ? body.languages : ["en"],
    });
    return this.listItem(teacher);
  }

  async detail(id: string): Promise<TeacherDetailDto> {
    const teacher = await this.repo.findById(id);
    if (!teacher) throw new NotFoundException("Преподаватель не найден");

    const groups = await this.repo.findGroupsFor(id);
    const groupIds = groups.map((g) => g.id);
    const groupStudents = groups.reduce((sum, g) => sum + g._count.students, 0);
    const individuals = await this.repo.findIndividualsFor(id);
    const today = this.today();
    const practicesToday = await this.repo.practicesTodayCount(groupIds, today);

    const groupDtos = await Promise.all(
      groups.map(async (g) => {
        const product = await this.resolver.byId(g.courseProductId);
        const levelPlan = (product.levelPlan as unknown as LevelPlanEntry[]) ?? [];
        const lessonCount = await this.resolver.countLessons(g.courseProductId);
        const stage = groupStage(g.currentLesson, levelPlan, lessonCount, product.durationMonths);
        return {
          id: g.id,
          name: g.name,
          language: g.language,
          status: g.status,
          practiceStart: g.practiceStart,
          practiceEnd: g.practiceEnd,
          studentCount: g._count.students,
          maxStudents: g.maxStudents,
          month: stage.month,
          level: stage.level,
        };
      }),
    );

    return {
      id: teacher.id,
      name: teacher.name,
      languages: teacher.languages,
      status: teacher.status,
      phone: teacher.phone,
      tone: teacher.tone,
      stats: {
        groupsCount: groups.length,
        groupStudents,
        individualsCount: individuals.length,
        practicesToday,
      },
      groups: groupDtos,
      individuals: individuals.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarTone: s.avatarTone,
        language: s.language,
      })),
    };
  }

  async update(id: string, body: UpdateTeacherRequestDto): Promise<TeacherListItemDto> {
    const teacher = await this.repo.findById(id);
    if (!teacher) throw new NotFoundException("Преподаватель не найден");
    const updated = await this.repo.update(id, {
      status: body.status,
      phone: body.phone,
      languages: body.languages,
    });
    return this.listItem(updated);
  }

  async remove(id: string): Promise<void> {
    const teacher = await this.repo.findById(id);
    if (!teacher) throw new NotFoundException("Преподаватель не найден");
    // Преподаватель — управляемая сущность без логина: отвязываем от групп и
    // учеников (валидное состояние «без преподавателя») и удаляем.
    await this.prisma.$transaction([
      this.prisma.group.updateMany({ where: { teacherId: id }, data: { teacherId: null } }),
      this.prisma.student.updateMany({ where: { teacherId: id }, data: { teacherId: null } }),
      this.prisma.teacher.delete({ where: { id } }),
    ]);
  }
}
