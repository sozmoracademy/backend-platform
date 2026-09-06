import { Injectable, Logger } from "@nestjs/common";
import type { VideoStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { BunnyStreamService } from "./bunny-stream.service";
import { mapWebhookStatus } from "./bunny-token";

/**
 * Приём webhook Bunny. Пишет напрямую через Prisma (`updateMany where
 * videoAssetId`) — так модуль не зависит от `LessonsModule` и цикла импортов нет.
 * Webhook может прийти для урока, который к этому моменту переотвязали, поэтому
 * `updateMany` (0 строк — не ошибка).
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bunny: BunnyStreamService,
  ) {}

  async applyWebhook(videoGuid: string, rawStatus: number): Promise<void> {
    const status = mapWebhookStatus(rawStatus) as VideoStatus;
    const durationSec = status === "ready" ? await this.bunny.getDurationSec(videoGuid) : null;

    const { count } = await this.prisma.lesson.updateMany({
      where: { videoAssetId: videoGuid },
      data: {
        videoStatus: status,
        ...(durationSec != null ? { videoDurationSec: durationSec } : {}),
      },
    });
    this.logger.log(
      `Bunny webhook: video=${videoGuid} status=${rawStatus}→${status} обновлено уроков=${count}`,
    );
  }
}
