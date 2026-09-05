import { Injectable, NotFoundException } from "@nestjs/common";
import { LessonsRepository } from "./lessons.repository";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";
import { LessonEditorDto, UpdateLessonRequestDto } from "./dto/lesson-editor.dto";

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

  private async toEditorDto(lesson: {
    order: number;
    title: string;
    description: string;
    videoUrl: string;
    duration: string;
    block: string;
  }): Promise<LessonEditorDto> {
    const [opened, completed, inProgress] = await Promise.all([
      this.lessons.countOpened(lesson.order),
      this.lessons.countCompleted(lesson.order),
      this.lessons.countInProgress(lesson.order),
    ]);
    return {
      order: lesson.order,
      title: lesson.title,
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      block: lesson.block,
      stats: { opened, inProgress, completed },
    };
  }

  async editor(order: number): Promise<LessonEditorDto> {
    const lesson = await this.lessons.findByOrder(order);
    if (!lesson) throw new NotFoundException("Урок не найден");
    return this.toEditorDto(lesson);
  }

  async update(order: number, body: UpdateLessonRequestDto): Promise<LessonEditorDto> {
    const lesson = await this.lessons.findByOrder(order);
    if (!lesson) throw new NotFoundException("Урок не найден");
    const updated = await this.lessons.update(order, {
      title: body.title?.trim(),
      description: body.description,
      videoUrl: body.videoUrl,
    });
    return this.toEditorDto(updated);
  }
}
