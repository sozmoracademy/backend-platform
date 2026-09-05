import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { LessonTest, QuestionOption, TestQuestion } from "@prisma/client";
import { TestsRepository } from "./tests.repository";
import {
  CreateTestRequestDto,
  TestEditorDto,
  UpdateOptionRequestDto,
  UpdateQuestionRequestDto,
  UpdateTestRequestDto,
} from "./dto/test-editor.dto";

type FullTest = LessonTest & { questions: (TestQuestion & { options: QuestionOption[] })[] };

/**
 * Редактор теста — роль curator (BACKEND.md §12: `/tests`, `/questions/:id`,
 * `/options/:id`). Отдельный сервис от студенческого `TestsService` — общий
 * только `TestsRepository`.
 */
@Injectable()
export class TestsEditorService {
  constructor(private readonly repo: TestsRepository) {}

  private toDto(test: FullTest): TestEditorDto {
    return {
      id: test.id,
      lessonOrder: test.lessonOrder,
      title: test.title,
      timeLimitSec: test.timeLimitSec,
      passingScore: test.passingScore,
      status: test.status,
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        order: q.order,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      })),
    };
  }

  async byLessonOrder(order: number): Promise<TestEditorDto | null> {
    const test = await this.repo.findFullByLessonOrder(order, false);
    return test ? this.toDto(test) : null;
  }

  async create(body: CreateTestRequestDto): Promise<TestEditorDto> {
    const lesson = await this.repo.findLessonByOrder(body.lessonOrder);
    if (!lesson) throw new BadRequestException("Урок не найден");
    const existing = await this.repo.findFullByLessonOrder(body.lessonOrder, false);
    if (existing) return this.toDto(existing);

    const test = await this.repo.createTest({
      lessonOrder: body.lessonOrder,
      title: `Тест к уроку ${body.lessonOrder}`,
    });
    return this.toDto(test);
  }

  private async loadTestOrThrow(id: string): Promise<FullTest> {
    const test = await this.repo.findFullById(id);
    if (!test) throw new NotFoundException("Тест не найден");
    return test;
  }

  async update(id: string, body: UpdateTestRequestDto): Promise<TestEditorDto> {
    const test = await this.loadTestOrThrow(id);
    // Публикация — только при >= 1 вопросе (TЗ, инвариант 6).
    if (body.status === "published" && test.questions.length === 0) {
      throw new BadRequestException("Нельзя опубликовать тест без вопросов");
    }
    const updated = await this.repo.updateTest(id, {
      title: body.title,
      timeLimitSec: body.timeLimitSec,
      passingScore: body.passingScore,
      status: body.status,
    });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.loadTestOrThrow(id);
    await this.repo.deleteTest(id);
  }

  async addQuestion(testId: string): Promise<TestEditorDto> {
    const test = await this.loadTestOrThrow(testId);
    await this.repo.createQuestion(testId, test.questions.length + 1);
    const updated = await this.loadTestOrThrow(testId);
    return this.toDto(updated);
  }

  private async testOwningQuestion(questionId: string): Promise<FullTest> {
    const question = await this.repo.findQuestionById(questionId);
    if (!question) throw new NotFoundException("Вопрос не найден");
    return this.loadTestOrThrow(question.testId);
  }

  async updateQuestion(questionId: string, body: UpdateQuestionRequestDto): Promise<TestEditorDto> {
    const test = await this.testOwningQuestion(questionId);
    await this.repo.updateQuestion(questionId, { text: body.text, type: body.type });
    return this.toDto(await this.loadTestOrThrow(test.id));
  }

  async removeQuestion(questionId: string): Promise<TestEditorDto> {
    const test = await this.testOwningQuestion(questionId);
    await this.repo.deleteQuestion(questionId);
    // Перенумеровать оставшиеся вопросы 1..N (BACKEND.md §12).
    const remaining = await this.repo.findRemainingQuestionsOrdered(test.id);
    await Promise.all(
      remaining.map((q, i) =>
        q.order !== i + 1 ? this.repo.reorderQuestion(q.id, i + 1) : Promise.resolve(),
      ),
    );
    return this.toDto(await this.loadTestOrThrow(test.id));
  }

  async updateOption(optionId: string, body: UpdateOptionRequestDto): Promise<TestEditorDto> {
    const option = await this.repo.findOptionById(optionId);
    if (!option) throw new NotFoundException("Вариант не найден");
    await this.repo.updateOption(optionId, { text: body.text, isCorrect: body.isCorrect });
    // Для single-choice правильный вариант — эксклюзивно (BACKEND.md §12).
    if (body.isCorrect && option.question.type === "single") {
      await this.repo.exclusivifyOptions(option.questionId, optionId);
    }
    return this.toDto(await this.loadTestOrThrow(option.question.testId));
  }
}
