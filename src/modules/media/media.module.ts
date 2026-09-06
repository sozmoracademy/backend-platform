import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { BunnyStreamService } from "./bunny-stream.service";

/**
 * Изолирует всё, что знает про Bunny Stream. `BunnyStreamService` экспортится —
 * его импортируют `LessonsModule` (запрос загрузки) и `StudentCabinetModule`
 * (подпись HLS-URL). Webhook обслуживается внутри модуля через Prisma напрямую.
 */
@Module({
  controllers: [MediaController],
  providers: [MediaService, BunnyStreamService],
  exports: [BunnyStreamService],
})
export class MediaModule {}
