import { ApiProperty } from "@nestjs/swagger";

/**
 * Ответ `POST .../lessons/:order/video/upload` — разрешение на прямую заливку
 * файла в Bunny по TUS. API-ключ Bunny сюда не входит: только одноразовая
 * подпись на конкретное `videoId` с коротким сроком жизни.
 */
export class VideoUploadTicketDto {
  @ApiProperty({ description: "GUID созданного видео в Bunny." })
  videoId!: string;

  @ApiProperty({ description: "TUS-эндпоинт Bunny." })
  endpoint!: string;

  @ApiProperty({
    description: "Заголовки для tus-js-client (AuthorizationSignature/Expire, LibraryId, VideoId).",
    type: "object",
    additionalProperties: { type: "string" },
  })
  headers!: Record<string, string>;
}
