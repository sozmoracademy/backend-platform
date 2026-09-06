import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, Min, MinLength, IsInt } from "class-validator";
import type { QuestionType, TestStatus } from "@prisma/client";

export class TestEditorOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() isCorrect!: boolean;
}

export class TestEditorQuestionDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ enum: ["single", "multiple"] }) type!: QuestionType;
  @ApiProperty() order!: number;
  @ApiProperty({ type: [TestEditorOptionDto] }) options!: TestEditorOptionDto[];
}

/** `GET /tests/lesson/:lessonId` (для редактора) — полный тест с `isCorrect` (куратор всегда его видит). */
export class TestEditorDto {
  @ApiProperty() id!: string;
  @ApiProperty() lessonId!: string;
  @ApiProperty() lessonOrder!: number;
  @ApiProperty() title!: string;
  @ApiProperty() timeLimitSec!: number;
  @ApiProperty() passingScore!: number;
  @ApiProperty({ enum: ["draft", "published"] }) status!: TestStatus;
  @ApiProperty({ type: [TestEditorQuestionDto] }) questions!: TestEditorQuestionDto[];
}

export class CreateTestRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  lessonId!: string;
}

export class UpdateTestRequestDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(1) title?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) timeLimitSec?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) passingScore?: number;
  @ApiProperty({ required: false, enum: ["draft", "published"] })
  @IsOptional()
  @IsEnum(["draft", "published"])
  status?: TestStatus;
}

export class UpdateQuestionRequestDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() text?: string;
  @ApiProperty({ required: false, enum: ["single", "multiple"] })
  @IsOptional()
  @IsEnum(["single", "multiple"])
  type?: QuestionType;
}

export class UpdateOptionRequestDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() text?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isCorrect?: boolean;
}
