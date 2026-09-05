import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class LessonStatsDto {
  @ApiProperty() opened!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() completed!: number;
}

export class LessonEditorDto {
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() videoUrl!: string;
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
