import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsString, Min, MinLength } from "class-validator";

/**
 * `POST /courses/products/:productId/lessons/:order/video/link-from` (роль C) —
 * привязать к уроку видео другого урока БЕЗ повторной заливки в Bunny. Обе
 * записи `Lesson` начинают указывать на один `videoAssetId` (GUID Bunny);
 * webhook/`reconcile` уже обновляют все строки с этим GUID (`updateMany`).
 * Нужно, чтобы одинаковые уроки 3‑ и 6‑месячного курса (и EN/RU) показывали
 * один и тот же файл — экономия места в CDN и времени кодирования.
 */
export class LinkLessonVideoRequestDto {
  @ApiProperty({
    description: "Продукт урока-донора. Может совпадать с продуктом целевого урока.",
  })
  @IsString()
  @MinLength(1)
  sourceProductId!: string;

  @ApiProperty({ description: "Номер урока-донора в его продукте (>= 1)." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sourceOrder!: number;
}
