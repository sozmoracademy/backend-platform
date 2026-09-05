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
}
