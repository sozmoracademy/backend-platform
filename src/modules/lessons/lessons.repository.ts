import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllOrdered() {
    return this.prisma.lesson.findMany({ orderBy: { order: "asc" } });
  }

  findByOrder(order: number) {
    return this.prisma.lesson.findUnique({ where: { order } });
  }

  /** Заказы уроков, у которых есть хотя бы одна практика (BACKEND.md §12, `hasPractice`). */
  async ordersWithPractice(): Promise<Set<number>> {
    const rows = await this.prisma.meeting.findMany({
      select: { lessonOrder: true },
      distinct: ["lessonOrder"],
    });
    return new Set(rows.map((r) => r.lessonOrder));
  }

  countOpened(order: number) {
    return this.prisma.student.count({ where: { openedUpTo: { gte: order } } });
  }

  countCompleted(order: number) {
    return this.prisma.studentLesson.count({ where: { lessonOrder: order, completedAt: { not: null } } });
  }

  countInProgress(order: number) {
    return this.prisma.studentLesson.count({
      where: { lessonOrder: order, completedAt: null, watchedPct: { gt: 0 } },
    });
  }

  update(order: number, data: { title?: string; description?: string; videoUrl?: string }) {
    return this.prisma.lesson.update({ where: { order }, data });
  }
}
