import { Injectable } from "@nestjs/common";
import type { VideoStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllOrdered(courseProductId: string) {
    return this.prisma.lesson.findMany({ where: { courseProductId }, orderBy: { order: "asc" } });
  }

  findByOrder(courseProductId: string, order: number) {
    return this.prisma.lesson.findUnique({ where: { courseProductId_order: { courseProductId, order } } });
  }

  /** Наибольший `order` среди уроков продукта (0, если уроков ещё нет). */
  async maxOrder(courseProductId: string): Promise<number> {
    const row = await this.prisma.lesson.aggregate({
      where: { courseProductId },
      _max: { order: true },
    });
    return row._max.order ?? 0;
  }

  create(data: {
    courseProductId: string;
    order: number;
    title: string;
    description: string;
    videoUrl: string;
    duration: string;
    block: string;
  }) {
    return this.prisma.lesson.create({ data });
  }

  /** Заказы уроков продукта, у которых есть хотя бы одна практика (BACKEND.md §12, `hasPractice`). */
  async ordersWithPractice(courseProductId: string): Promise<Set<number>> {
    const rows = await this.prisma.meeting.findMany({
      where: { lesson: { courseProductId } },
      select: { lesson: { select: { order: true } } },
      distinct: ["lessonId"],
    });
    return new Set(rows.map((r) => r.lesson.order));
  }

  /** Студенты, реально относящиеся к этому продукту (через свою группу или язык+INDIVIDUAL), у которых открыт этот урок. */
  countOpened(courseProductId: string, order: number, language: string, format: string) {
    if (format === "INDIVIDUAL") {
      return this.prisma.student.count({
        where: { type: "INDIVIDUAL", language: language as never, openedUpTo: { gte: order } },
      });
    }
    return this.prisma.student.count({
      where: { group: { courseProductId }, openedUpTo: { gte: order } },
    });
  }

  countCompleted(lessonId: string) {
    return this.prisma.studentLesson.count({ where: { lessonId, completedAt: { not: null } } });
  }

  countInProgress(lessonId: string) {
    return this.prisma.studentLesson.count({
      where: { lessonId, completedAt: null, watchedPct: { gt: 0 } },
    });
  }

  update(
    courseProductId: string,
    order: number,
    data: {
      title?: string;
      description?: string;
      videoUrl?: string;
      videoAssetId?: string | null;
      videoStatus?: VideoStatus;
      videoDurationSec?: number | null;
    },
  ) {
    return this.prisma.lesson.update({ where: { courseProductId_order: { courseProductId, order } }, data });
  }
}
