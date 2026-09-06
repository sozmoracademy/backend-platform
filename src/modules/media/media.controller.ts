import { BadRequestException, Body, Controller, ForbiddenException, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { BunnyStreamService } from "./bunny-stream.service";
import { MediaService } from "./media.service";
import { BunnyWebhookAckDto, BunnyWebhookDto, parseBunnyWebhook } from "./dto/bunny-webhook.dto";

/** `media` — обратные вызовы видеопровайдера. Аутентификация — по секрету в query. */
@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly bunny: BunnyStreamService,
  ) {}

  /**
   * Bunny дёргает этот URL после перекодирования. Из интернета доступен только в
   * проде; локально статус подхватывает поллинг фронта (`refetchInterval`).
   * Тело принимаем как свободный объект: Bunny шлёт больше полей, чем описано в
   * `BunnyWebhookDto`, а глобальный `forbidNonWhitelisted` их бы отверг.
   */
  @Public()
  @Post("bunny/webhook")
  @ApiOperation({ summary: "Webhook Bunny Stream: обновляет videoStatus урока по VideoGuid." })
  @ApiBody({ type: BunnyWebhookDto })
  async webhook(
    @Query("key") key: string,
    @Body() body: unknown,
  ): Promise<BunnyWebhookAckDto> {
    if (!key || key !== this.bunny.webhookKey) {
      throw new ForbiddenException("Неверный ключ webhook");
    }
    const parsed = parseBunnyWebhook(body);
    if (!parsed) throw new BadRequestException("Некорректное тело webhook");

    await this.media.applyWebhook(parsed.videoGuid, parsed.status);
    return { ok: true };
  }
}
