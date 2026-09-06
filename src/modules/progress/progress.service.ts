import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { GroupsService } from "../groups/groups.service";
import { CourseResolverService } from "../courses/course-resolver.service";
import type { GroupSummaryDto } from "../groups/dto/group.dto";

/**
 * `progress` — потабличное открытие уроков по группе, одной транзакцией
 * (BACKEND.md §7.1, TЗ инвариант 3). `order` валидируется против количества уроков
 * продукта конкретной группы (у каждого продукта — свой набор уроков).
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: GroupsService,
    private readonly resolver: CourseResolverService,
  ) {}

  private async lessonCountFor(groupId: string): Promise<{ courseProductId: string; lessonCount: number }> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("Группа не найдена");
    const lessonCount = await this.resolver.countLessons(group.courseProductId);
    return { courseProductId: group.courseProductId, lessonCount };
  }

  /** Открыть урок N → у активных учеников группы с `openedUpTo < N` ставится `openedUpTo = N`. */
  async publishForGroup(groupId: string, order: number): Promise<GroupSummaryDto> {
    const { lessonCount } = await this.lessonCountFor(groupId);
    if (order < 1 || order > lessonCount) throw new BadRequestException("Некорректный номер урока");

    await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException("Группа не найдена");

      await tx.group.update({
        where: { id: groupId },
        data: { currentLesson: Math.max(group.currentLesson, order) },
      });
      await tx.student.updateMany({
        where: { groupId, status: "active", openedUpTo: { lt: order } },
        data: { openedUpTo: order },
      });
    });

    return this.groups.summaryById(groupId);
  }

  /** Закрыть урок N → у учеников группы с `openedUpTo >= N` ставится `openedUpTo = N-1`. */
  async unpublishForGroup(groupId: string, order: number): Promise<GroupSummaryDto> {
    const { lessonCount } = await this.lessonCountFor(groupId);
    if (order < 1 || order > lessonCount) throw new BadRequestException("Некорректный номер урока");

    await this.prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({ where: { id: groupId } });
      if (!group) throw new NotFoundException("Группа не найдена");

      await tx.group.update({
        where: { id: groupId },
        data: { currentLesson: Math.max(0, Math.min(group.currentLesson, order - 1)) },
      });
      await tx.student.updateMany({
        where: { groupId, openedUpTo: { gte: order } },
        data: { openedUpTo: order - 1 },
      });
    });

    return this.groups.summaryById(groupId);
  }
}
