import { Injectable, NotFoundException } from "@nestjs/common";
import type { VideoStatus } from "@prisma/client";
import { LessonsRepository } from "./lessons.repository";
import { CourseResolverService } from "../courses/course-resolver.service";
import { BunnyStreamService } from "../media/bunny-stream.service";
import { CreateLessonRequestDto } from "./dto/create-lesson.dto";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";
import { LessonEditorDto, UpdateLessonRequestDto } from "./dto/lesson-editor.dto";
import { VideoUploadTicketDto } from "./dto/video-upload-ticket.dto";

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessons: LessonsRepository,
    private readonly resolver: CourseResolverService,
    private readonly bunny: BunnyStreamService,
  ) {}

  async catalog(courseProductId: string): Promise<LessonCatalogItemDto[]> {
    const [rows, withPractice] = await Promise.all([
      this.lessons.findAllOrdered(courseProductId),
      this.lessons.ordersWithPractice(courseProductId),
    ]);
    return rows.map((l) => ({
      id: l.id,
      order: l.order,
      title: l.title,
      block: l.block,
      duration: l.duration,
      hasPractice: withPractice.has(l.order),
    }));
  }

  private async toEditorDto(
    courseProductId: string,
    language: string,
    format: string,
    lesson: {
      id: string;
      order: number;
      title: string;
      description: string;
      videoUrl: string;
      videoAssetId: string | null;
      videoStatus: VideoStatus;
      duration: string;
      block: string;
    },
  ): Promise<LessonEditorDto> {
    const [opened, completed, inProgress] = await Promise.all([
      this.lessons.countOpened(courseProductId, lesson.order, language, format),
      this.lessons.countCompleted(lesson.id),
      this.lessons.countInProgress(lesson.id),
    ]);
    return {
      id: lesson.id,
      order: lesson.order,
      title: lesson.title,
      description: lesson.description,
      // Для превью в редакторе: готовое видео — подписанный Bunny-HLS, иначе fallback.
      videoUrl:
        lesson.videoAssetId && lesson.videoStatus === "ready"
          ? this.bunny.signedPlaylistUrl(lesson.videoAssetId)
          : lesson.videoUrl,
      videoStatus: lesson.videoStatus,
      duration: lesson.duration,
      block: lesson.block,
      stats: { opened, inProgress, completed },
    };
  }

  async editor(courseProductId: string, order: number): Promise<LessonEditorDto> {
    const product = await this.resolver.byId(courseProductId);
    const lesson = await this.lessons.findByOrder(courseProductId, order);
    if (!lesson) throw new NotFoundException("Урок не найден");
    return this.toEditorDto(courseProductId, product.language, product.format, lesson);
  }

  /**
   * Создать урок в конце набора продукта: `order = max(order) + 1`
   * (TЗ §15 п.9). `@@unique([courseProductId, order])` не нарушается — новый
   * номер строго больше всех существующих. Прогресс/встречи/тесты ссылаются на
   * `Lesson.id`, поэтому добавление в хвост ничего не ломает (TЗ §4.3).
   */
  async create(courseProductId: string, body: CreateLessonRequestDto): Promise<LessonEditorDto> {
    const product = await this.resolver.byId(courseProductId);
    const order = (await this.lessons.maxOrder(courseProductId)) + 1;
    const lesson = await this.lessons.create({
      courseProductId,
      order,
      title: body.title.trim(),
      description: body.description?.trim() ?? "",
      videoUrl: body.videoUrl?.trim() ?? "",
      duration: body.duration?.trim() || "00:00",
      block: body.block.trim(),
    });
    return this.toEditorDto(courseProductId, product.language, product.format, lesson);
  }

  async update(
    courseProductId: string,
    order: number,
    body: UpdateLessonRequestDto,
  ): Promise<LessonEditorDto> {
    const product = await this.resolver.byId(courseProductId);
    const lesson = await this.lessons.findByOrder(courseProductId, order);
    if (!lesson) throw new NotFoundException("Урок не найден");
    const updated = await this.lessons.update(courseProductId, order, {
      title: body.title?.trim(),
      description: body.description,
      videoUrl: body.videoUrl,
    });
    return this.toEditorDto(courseProductId, product.language, product.format, updated);
  }

  /**
   * Разрешение на прямую заливку видео в Bunny (TUS). Порядок: создаём видео в
   * Bunny → СРАЗУ пишем `videoAssetId` + `videoStatus = processing` (чтобы
   * webhook нашёл урок и связь пережила закрытие вкладки) → отдаём подпись.
   * Файл на бэкенд не приходит.
   */
  async requestVideoUpload(courseProductId: string, order: number): Promise<VideoUploadTicketDto> {
    const lesson = await this.lessons.findByOrder(courseProductId, order);
    if (!lesson) throw new NotFoundException("Урок не найден");

    const videoId = await this.bunny.createVideo(`${courseProductId} · lesson ${order}`);
    await this.lessons.update(courseProductId, order, {
      videoAssetId: videoId,
      videoStatus: "processing",
      videoDurationSec: null,
    });

    return { videoId, ...this.bunny.tusUpload(videoId) };
  }
}
