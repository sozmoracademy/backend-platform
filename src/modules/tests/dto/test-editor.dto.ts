import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString, Min, MinLength, IsInt } from "class-validator";
import type { CourseType, Lang, QuestionType, TestStatus } from "@prisma/client";

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

/**
 * `GET /tests/library` (роль C) — один тест-донор из любого продукта для «взять
 * тест из другого курса» (`features/copy-lesson-test`). Отдаются только тесты с
 * >= 1 вопросом — пустой копировать нечего. Тест привязан к уроку жёстко
 * (`LessonTest.lessonId @unique`), поэтому это копия, а не общая ссылка (в
 * отличие от видео).
 */
export class TestLibraryItemDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productTitle!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) format!: CourseType;
  @ApiProperty() durationMonths!: number;
  @ApiProperty() lessonId!: string;
  @ApiProperty({ description: "Номер урока-донора в пределах его продукта." }) lessonOrder!: number;
  @ApiProperty() lessonTitle!: string;
  @ApiProperty() testId!: string;
  @ApiProperty() testTitle!: string;
  @ApiProperty({ enum: ["draft", "published"] }) status!: TestStatus;
  @ApiProperty() questionCount!: number;
}

/** `POST /tests/lesson/:lessonId/copy-from` — скопировать в тест урока содержимое теста-донора. */
export class CopyTestFromRequestDto {
  @ApiProperty({ description: "Урок-донор — его тест копируется в целевой урок." })
  @IsString()
  @MinLength(1)
  sourceLessonId!: string;
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
