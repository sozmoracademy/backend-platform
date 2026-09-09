import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { VideoStatus } from "@prisma/client";
import { LessonsRepository } from "./lessons.repository";
import { CourseResolverService } from "../courses/course-resolver.service";
import { BunnyStreamService } from "../media/bunny-stream.service";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CreateLessonRequestDto } from "./dto/create-lesson.dto";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";
import { LessonEditorDto, UpdateLessonRequestDto } from "./dto/lesson-editor.dto";
import { LinkLessonVideoRequestDto } from "./dto/link-lesson-video.dto";
import { VideoUploadTicketDto } from "./dto/video-upload-ticket.dto";

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessons: LessonsRepository,
    private readonly resolver: CourseResolverService,
    private readonly bunny: BunnyStreamService,
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
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
    // Fallback, если webhook Bunny не дошёл: сверку с Bunny запускаем в фоне, не
    // блокируя ответ внешним HTTP-вызовом. Текущий статус отдаём сразу; если Bunny
    // уже `ready`, это подхватит следующее открытие редактора (или webhook раньше).
    if (lesson.videoStatus === "processing" && lesson.videoAssetId) {
      const assetId = lesson.videoAssetId;
      void this.media.reconcile(assetId, lesson.videoStatus).catch(() => undefined);
    }
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
    this.resolver.invalidate(courseProductId); // изменилось число уроков продукта
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
   * Удалить урок продукта. Дети урока (тест, попытки, практики, прогресс) не
   * имеют каскада от `Lesson` — снимаем явно. Затем последующие уроки
   * перенумеровываются `order-1`, а денормализованные «номера текущего урока»
   * (`Group.currentLesson`, `Student.openedUpTo`) клампятся вниз.
   */
  async remove(courseProductId: string, order: number): Promise<void> {
    const product = await this.resolver.byId(courseProductId);
    const lesson = await this.lessons.findByOrder(courseProductId, order);
    if (!lesson) throw new NotFoundException("Урок не найден");

    await this.prisma.$transaction(async (tx) => {
      await tx.testAttempt.deleteMany({ where: { lessonId: lesson.id } });
      await tx.lessonTest.deleteMany({ where: { lessonId: lesson.id } }); // questions/options — каскадом
      await tx.meetingAttendance.deleteMany({ where: { meeting: { lessonId: lesson.id } } });
      await tx.meeting.deleteMany({ where: { lessonId: lesson.id } });
      await tx.studentLesson.deleteMany({ where: { lessonId: lesson.id } });
      await tx.lesson.delete({ where: { id: lesson.id } });

      await tx.$executeRaw`
        UPDATE "Lesson" SET "order" = "order" - 1
        WHERE "courseProductId" = ${courseProductId} AND "order" > ${order}`;
      await tx.$executeRaw`
        UPDATE "Group" SET "currentLesson" = GREATEST("currentLesson" - 1, 1)
        WHERE "courseProductId" = ${courseProductId} AND "currentLesson" > ${order}`;
      if (product.format === "INDIVIDUAL") {
        await tx.$executeRaw`
          UPDATE "Student" SET "openedUpTo" = GREATEST("openedUpTo" - 1, 1)
          WHERE "type" = 'INDIVIDUAL' AND "language" = ${product.language}::"Lang" AND "openedUpTo" > ${order}`;
      } else {
        await tx.$executeRaw`
          UPDATE "Student" SET "openedUpTo" = GREATEST("openedUpTo" - 1, 1)
          WHERE "openedUpTo" > ${order}
          AND "groupId" IN (SELECT "id" FROM "Group" WHERE "courseProductId" = ${courseProductId})`;
      }
    });

    this.resolver.invalidate(courseProductId); // изменилось число уроков продукта
  }

  /**
   * Привязать к уроку видео другого урока без повторной заливки в Bunny: обе
   * записи `Lesson` начинают ссылаться на один `videoAssetId` (GUID). Копируем
   * весь видеоблок донора — `videoAssetId` + `videoStatus` + `videoDurationSec`
   * + `duration` + fallback `videoUrl`. Bunny не трогаем; статус донора уже
   * поддерживается webhook'ом/`reconcile` через `updateMany where videoAssetId`,
   * поэтому если донор ещё `processing`, целевой урок «доедет» до `ready` тем же
   * событием. Повторная заливка видео на одном из уроков (`requestVideoUpload`)
   * ставит НОВЫЙ GUID только этому уроку — связь разрывается, второй продолжает
   * играть прежний файл.
   */
  async linkVideoFrom(
    courseProductId: string,
    order: number,
    body: LinkLessonVideoRequestDto,
  ): Promise<LessonEditorDto> {
    const product = await this.resolver.byId(courseProductId);
    const target = await this.lessons.findByOrder(courseProductId, order);
    if (!target) throw new NotFoundException("Урок не найден");

    const source = await this.lessons.findByOrder(body.sourceProductId, body.sourceOrder);
    if (!source) throw new NotFoundException("Урок-донор не найден");
    if (source.id === target.id) {
      throw new BadRequestException("Нельзя привязать урок к самому себе");
    }
    if (!source.videoAssetId || source.videoStatus === "none" || source.videoStatus === "failed") {
      throw new BadRequestException("У урока-донора нет готового видео");
    }

    const updated = await this.lessons.update(courseProductId, order, {
      videoAssetId: source.videoAssetId,
      videoStatus: source.videoStatus,
      videoDurationSec: source.videoDurationSec,
      duration: source.duration,
      videoUrl: source.videoUrl,
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
