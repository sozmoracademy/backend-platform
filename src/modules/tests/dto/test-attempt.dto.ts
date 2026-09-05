import { ApiProperty } from "@nestjs/swagger";
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
 * Единая форма попытки (BACKEND.md §12) — дискриминант по `status`. Пока
 * `in_progress`, вопросы без `isCorrect` (скоринг и разбор — только после submit).
 */
export class TestAttemptDto {
  @ApiProperty({ enum: ["in_progress", "submitted"] }) status!: "in_progress" | "submitted";
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ required: false }) expiresAt?: string;
  @ApiProperty({ required: false }) passingScore?: number;
  @ApiProperty({ required: false }) correctCount?: number;
  @ApiProperty({ required: false }) totalQuestions?: number;
  @ApiProperty({ required: false }) score?: number;
  @ApiProperty({ required: false }) passed?: boolean;
  @ApiProperty() answers!: Record<string, string[]>;
  @ApiProperty({ type: [TestQuestionDto] }) questions!: (TestQuestionDto | TestQuestionReviewDto)[];
}
