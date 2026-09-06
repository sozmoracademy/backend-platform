import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import type { VideoStatus } from "@prisma/client";

export class LessonStatsDto {
  @ApiProperty() opened!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() completed!: number;
}

export class LessonEditorDto {
  @ApiProperty() id!: string;
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  /**
   * Что показывать в плеере редактора: подписанный Bunny-HLS (если видео
   * `ready`), иначе — внешняя ссылка / placeholder из сида (`videoUrl` в БД).
   */
  @ApiProperty() videoUrl!: string;
  @ApiProperty({
    enum: ["none", "processing", "ready", "failed"],
    description: "processing → редактор показывает «идёт обработка», плеер выключен.",
  })
  videoStatus!: VideoStatus;
  @ApiProperty() duration!: string;
  @ApiProperty() block!: string;
  @ApiProperty({ type: LessonStatsDto }) stats!: LessonStatsDto;
}

export class UpdateLessonRequestDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(1) title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
