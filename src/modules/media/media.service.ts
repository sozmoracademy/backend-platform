import { Injectable, Logger } from "@nestjs/common";
import type { VideoStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { BunnyStreamService } from "./bunny-stream.service";
import { mapWebhookStatus, type VideoStatusValue } from "./bunny-token";

/**
 * Синхронизация статуса видео Bunny с БД. Пишет напрямую через Prisma
 * (`updateMany where videoAssetId`) — так модуль не зависит от `LessonsModule` и
 * цикла импортов нет. Строка могла быть переотвязана — `updateMany` (0 строк не
 * ошибка).
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bunny: BunnyStreamService,
  ) {}

  private async persist(videoGuid: string, status: VideoStatusValue): Promise<void> {
    const durationSec = status === "ready" ? await this.bunny.getDurationSec(videoGuid) : null;
    const { count } = await this.prisma.lesson.updateMany({
      where: { videoAssetId: videoGuid },
      data: {
        videoStatus: status as VideoStatus,
        ...(durationSec != null ? { videoDurationSec: durationSec } : {}),
      },
    });
    this.logger.log(`video=${videoGuid} → ${status}, обновлено уроков=${count}`);
  }

  /** Обработка webhook от Bunny (основной путь в проде). */
  async applyWebhook(videoGuid: string, rawStatus: number): Promise<void> {
    await this.persist(videoGuid, mapWebhookStatus(rawStatus));
  }

  /**
   * Fallback-сверка: спрашиваем Bunny напрямую и, если обработка завершилась,
   * фиксируем в БД. Нужен, когда webhook не дошёл (локалка без туннеля или
   * неверный Webhook URL в панели Bunny). Возвращает актуальный статус.
   */
  async reconcile(videoGuid: string, current: VideoStatusValue): Promise<VideoStatusValue> {
    if (current !== "processing") return current;
    const fresh = await this.bunny.getStatus(videoGuid);
    if (!fresh || fresh === "processing") return current;
    await this.persist(videoGuid, fresh);
    return fresh;
  }
}
