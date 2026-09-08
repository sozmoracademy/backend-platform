import { ApiProperty } from "@nestjs/swagger";
import type { CourseType, Lang, VideoStatus } from "@prisma/client";

/**
 * `GET /courses/video-library` (роль C) — один урок с залитым видео из любого
 * продукта. Каталог доноров для «взять видео из другого курса»
 * (`features/link-lesson-video` во фронте). Отдаются только уроки со статусом
 * `ready` или `processing` — `none`/`failed` как донор бесполезны.
 */
export class VideoLibraryItemDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productTitle!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) format!: CourseType;
  @ApiProperty() durationMonths!: number;
  @ApiProperty() lessonId!: string;
  @ApiProperty({ description: "Номер урока в пределах его продукта." }) order!: number;
  @ApiProperty() lessonTitle!: string;
  @ApiProperty({ enum: ["processing", "ready", "failed"] }) videoStatus!: VideoStatus;
  @ApiProperty({ nullable: true, type: Number }) videoDurationSec!: number | null;
}
