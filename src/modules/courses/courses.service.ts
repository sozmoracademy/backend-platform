import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CourseBlockDto, CourseLevelPlanEntryDto, CourseProductDto } from "./dto/course-product.dto";
import { VideoLibraryItemDto } from "./dto/video-library-item.dto";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async products(): Promise<CourseProductDto[]> {
    const rows = await this.prisma.courseProduct.findMany({
      orderBy: [{ durationMonths: "desc" }, { language: "asc" }],
    });
    return rows.map((p) => ({
      id: p.id,
      language: p.language,
      format: p.format,
      title: p.title,
      durationMonths: p.durationMonths,
      price: p.price,
      currency: p.currency,
      features: p.features,
      levelPlan: p.levelPlan as unknown as CourseLevelPlanEntryDto[],
    }));
  }

  async blocks(): Promise<CourseBlockDto[]> {
    const rows = await this.prisma.courseBlock.findMany({ orderBy: { month: "asc" } });
    return rows.map((b) => ({
      block: b.name,
      title: b.title,
      level: b.level as CourseBlockDto["level"],
      month: b.month,
    }));
  }

  /**
   * Тестовое видео (TЗ §4.3) — не входит в перечень эндпоинтов BACKEND.md §12
   * (расхождение с фактическим MSW-контрактом фронта, см. отчёт по расхождениям),
   * временно подменяет `videoUrl` во всех уроках. Хранится в singleton `AppSettings`.
   */
  /**
   * Все уроки всех продуктов, у которых уже есть видео в Bunny (`ready` или
   * `processing`). Источник выбора урока-донора для `link-from`. `failed`/`none`
   * не отдаём — переиспользовать нечего.
   */
  async videoLibrary(): Promise<VideoLibraryItemDto[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { videoAssetId: { not: null }, videoStatus: { in: ["ready", "processing"] } },
      include: { courseProduct: true },
      orderBy: [{ courseProduct: { durationMonths: "asc" } }, { order: "asc" }],
    });
    return rows.map((l) => ({
      productId: l.courseProductId,
      productTitle: l.courseProduct.title,
      language: l.courseProduct.language,
      format: l.courseProduct.format,
      durationMonths: l.courseProduct.durationMonths,
      lessonId: l.id,
      order: l.order,
      lessonTitle: l.title,
      videoStatus: l.videoStatus,
      videoDurationSec: l.videoDurationSec,
    }));
  }

  async previewVideo(): Promise<{ url: string | null }> {
    const row = await this.prisma.appSettings.findUnique({ where: { id: "singleton" } });
    return { url: row?.previewVideoUrl ?? null };
  }

  async setPreviewVideo(url: string | null): Promise<{ url: string | null }> {
    const row = await this.prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: { previewVideoUrl: url },
      create: { id: "singleton", previewVideoUrl: url },
    });
    return { url: row.previewVideoUrl };
  }
}
