import { Injectable } from "@nestjs/common";
import { LessonsRepository } from "./lessons.repository";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";

@Injectable()
export class LessonsService {
  constructor(private readonly lessons: LessonsRepository) {}

  async catalog(): Promise<LessonCatalogItemDto[]> {
    const [rows, withPractice] = await Promise.all([
      this.lessons.findAllOrdered(),
      this.lessons.ordersWithPractice(),
    ]);
    return rows.map((l) => ({
      order: l.order,
      title: l.title,
      block: l.block,
      duration: l.duration,
      hasPractice: withPractice.has(l.order),
    }));
  }
}
