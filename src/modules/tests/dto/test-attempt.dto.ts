import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";
import type { QuestionType } from "@prisma/client";
import type { TestAvailability, TestLockedReason } from "../../../common/domain";

export class TestBestResultDto {
  @ApiProperty() score!: number;
  @ApiProperty() passed!: boolean;
}

/** `GET /me/tests/:order` — интро-экран (BACKEND.md §12). */
export class TestIntroDto {
  @ApiProperty() title!: string;
  @ApiProperty() questionCount!: number;
  @ApiProperty() timeLimitSec!: number;
  @ApiProperty() passingScore!: number;
  @ApiProperty({ enum: ["locked", "available", "in_progress", "passed", "failed"] })
  availability!: TestAvailability;
  @ApiProperty({ enum: ["lesson_not_completed", "not_published"], required: false })
  lockedReason?: TestLockedReason;
  @ApiProperty({ type: TestBestResultDto, required: false }) best?: TestBestResultDto;
  @ApiProperty({ required: false }) activeAttemptId?: string;
}

export class SaveAnswerRequestDto {
  @ApiProperty()
  @IsString()
  questionId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  optionIds!: string[];
}

export class QuestionOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
}

export class QuestionOptionReviewDto extends QuestionOptionDto {
  @ApiProperty() isCorrect!: boolean;
}

export class TestQuestionDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ enum: ["single", "multiple"] }) type!: QuestionType;
  @ApiProperty({ type: [QuestionOptionDto] }) options!: QuestionOptionDto[];
}

export class TestQuestionReviewDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ enum: ["single", "multiple"] }) type!: QuestionType;
  @ApiProperty({ type: [QuestionOptionReviewDto] }) options!: QuestionOptionReviewDto[];
}

/**
 * Единая форма попытки (BACKEND.md §12) — дискриминант по `status`.
 * `in_progress`: вопросы без `isCorrect` (`TestQuestionDto`); `submitted`: с разбором
 * (`TestQuestionReviewDto`, `isCorrect` у опций) + баллы. Контракт описан как `oneOf`,
 * чтобы `openapi-typescript` во фронте выдал дискриминированный union.
 */
@ApiExtraModels(TestQuestionDto, TestQuestionReviewDto)
export class TestAttemptDto {
  @ApiProperty({ enum: ["in_progress", "submitted"] }) status!: "in_progress" | "submitted";
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false, description: "Только для status=in_progress" }) expiresAt?: string;
  @ApiProperty({ required: false, description: "Только для status=submitted" }) passingScore?: number;
  @ApiProperty({ required: false, description: "Только для status=submitted" }) correctCount?: number;
  @ApiProperty({ required: false, description: "Только для status=submitted" }) totalQuestions?: number;
  @ApiProperty({ required: false, description: "Только для status=submitted" }) score?: number;
  @ApiProperty({ required: false, description: "Только для status=submitted" }) passed?: boolean;
  @ApiProperty({ type: "object", additionalProperties: { type: "array", items: { type: "string" } } })
  answers!: Record<string, string[]>;
  @ApiProperty({
    type: "array",
    items: { oneOf: [{ $ref: getSchemaPath(TestQuestionDto) }, { $ref: getSchemaPath(TestQuestionReviewDto) }] },
  })
  questions!: (TestQuestionDto | TestQuestionReviewDto)[];
}
