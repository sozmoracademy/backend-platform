import { ApiProperty } from "@nestjs/swagger";

/**
 * Тело webhook Bunny Stream (Library → Webhook). Приходит на
 * `POST /media/bunny/webhook?key=<BUNNY_WEBHOOK_KEY>`. Bunny кладёт и лишние
 * поля (`VideoLibraryId` и пр.), поэтому в контроллере тело принимается как
 * свободный объект и проверяется вручную — этот класс только для Swagger.
 */
export class BunnyWebhookDto {
  @ApiProperty({ description: "GUID видео в библиотеке Bunny." })
  VideoGuid!: string;

  @ApiProperty({ description: "Числовой статус: 3/4 — готово, 5 — ошибка." })
  Status!: number;
}

export class BunnyWebhookAckDto {
  @ApiProperty() ok!: boolean;
}

/** Разбор произвольного тела webhook. `null` — тело не распознано. */
export function parseBunnyWebhook(body: unknown): { videoGuid: string; status: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const videoGuid = b.VideoGuid;
  const status = b.Status;
  if (typeof videoGuid !== "string" || videoGuid.length === 0) return null;
  if (typeof status !== "number" || !Number.isFinite(status)) return null;
  return { videoGuid, status };
}
