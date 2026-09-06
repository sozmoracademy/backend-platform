import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { LessonTest, QuestionOption, TestAttempt, TestQuestion } from "@prisma/client";
import { TestsRepository } from "./tests.repository";
import {
  activeAttemptOf,
  bestAttemptOf,
  effectiveAccessStatus,
  scoreAttempt,
  testAvailability,
  type AttemptLike,
  type TestLockedReason,
} from "../../common/domain";
import { SaveAnswerRequestDto, TestAttemptDto, TestIntroDto } from "./dto/test-attempt.dto";
import { CourseResolverService } from "../courses/course-resolver.service";

type FullTest = LessonTest & {
  questions: (TestQuestion & { options: QuestionOption[] })[];
  lesson: { id: string; order: number };
};

@Injectable()
export class TestsService {
  constructor(
    private readonly repo: TestsRepository,
    private readonly resolver: CourseResolverService,
  ) {}

  /** Тот же объект, что и Prisma-модель, но с `expiresAt` строкой — совместимо с `AttemptLike`
   * (чистые функции не знают про `Date`) и сохраняет остальные поля (`id`, …) через generics. */
  private toAttemptLikeRow<T extends TestAttempt>(a: T): Omit<T, "expiresAt"> & AttemptLike {
    return { ...a, expiresAt: a.expiresAt.toISOString() };
  }

  private async requireActiveAccess(studentId: string): Promise<void> {
    const student = await this.repo.findStudentAccessInfo(studentId);
    const status = effectiveAccessStatus(
      { status: student.status, endDate: student.endDate.toISOString().slice(0, 10) },
      new Date().toISOString().slice(0, 10),
    );
    if (status !== "active") throw new ForbiddenException("Доступ к обучению закрыт");
  }

  private async lessonCompleted(studentId: string, lessonId: string): Promise<boolean> {
    const row = await this.repo.findLessonCompletion(studentId, lessonId);
    return Boolean(row?.completedAt);
  }

  /** Автосабмит просроченной `in_progress` попытки при любом обращении (BACKEND.md §7.3). */
  private async ensureFresh(attempt: TestAttempt, test: FullTest): Promise<TestAttempt> {
    if (attempt.status !== "in_progress" || attempt.expiresAt.getTime() > Date.now()) return attempt;
    const result = scoreAttempt(
      test.questions,
      attempt.answers as Record<string, string[]>,
      test.passingScore,
    );
    return this.repo.submitAttempt(attempt.id, {
      correctCount: result.correctCount,
      totalQuestions: result.total,
      score: result.score,
      passed: result.passed,
    });
  }

  private toTakingDto(attempt: TestAttempt, test: FullTest): TestAttemptDto {
    return {
      status: "in_progress",
      id: attempt.id,
      title: test.title,
      expiresAt: attempt.expiresAt.toISOString(),
      answers: attempt.answers as Record<string, string[]>,
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    };
  }

  private toResultDto(attempt: TestAttempt, test: FullTest): TestAttemptDto {
    return {
      status: "submitted",
      id: attempt.id,
      title: test.title,
      passingScore: test.passingScore,
      correctCount: attempt.correctCount ?? 0,
      totalQuestions: attempt.totalQuestions,
      score: attempt.score ?? 0,
      passed: attempt.passed ?? false,
      answers: attempt.answers as Record<string, string[]>,
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      })),
    };
  }

  private toAttemptDto(attempt: TestAttempt, test: FullTest): TestAttemptDto {
    return attempt.status === "submitted" ? this.toResultDto(attempt, test) : this.toTakingDto(attempt, test);
  }

  async intro(studentId: string, order: number): Promise<TestIntroDto> {
    const student = await this.repo.findStudentAccessInfo(studentId);
    const product = await this.resolver.forStudent(student);
    const test = await this.repo.findLightByLessonOrder(product.id, order, false);
    if (!test) throw new NotFoundException("Тест не найден");

    const attempts = await this.repo.findAttemptsForTest(studentId, test.id);
    const freshenedAttempts = (await this.freshenAll(attempts, test.id)).map((a) => this.toAttemptLikeRow(a));

    const lessonDone = await this.lessonCompleted(studentId, test.lesson.id);
    const now = new Date().toISOString();
    const availability = testAvailability(test.status, lessonDone, freshenedAttempts, now);
    const active = activeAttemptOf(freshenedAttempts, now);
    const best = bestAttemptOf(freshenedAttempts);

    return {
      title: test.title,
      questionCount: test._count.questions,
      timeLimitSec: test.timeLimitSec,
      passingScore: test.passingScore,
      availability,
      ...(availability === "locked"
        ? {
            lockedReason: (!lessonDone ? "lesson_not_completed" : "not_published") satisfies TestLockedReason,
          }
        : {}),
      ...(best ? { best: { score: best.score ?? 0, passed: best.passed ?? false } } : {}),
      ...(active ? { activeAttemptId: active.id } : {}),
    };
  }

  /** Прогоняет `ensureFresh` по всем попыткам теста, возвращает актуализированный список. */
  private async freshenAll(attempts: TestAttempt[], testId: string): Promise<TestAttempt[]> {
    if (attempts.length === 0) return attempts;
    const test = await this.repo.findFullById(testId);
    if (!test) return attempts;
    return Promise.all(attempts.map((a) => this.ensureFresh(a, test)));
  }

  async startAttempt(studentId: string, order: number): Promise<TestAttemptDto> {
    await this.requireActiveAccess(studentId);

    const student = await this.repo.findStudentAccessInfo(studentId);
    const product = await this.resolver.forStudent(student);
    const test = await this.repo.findFullByLessonOrder(product.id, order, true);
    if (!test) throw new NotFoundException("Тест не найден");
    if (!(await this.lessonCompleted(studentId, test.lesson.id)))
      throw new ForbiddenException("Тест пока недоступен");

    const existingAttempts = await this.repo.findAttemptsForTest(studentId, test.id);
    const freshened = await Promise.all(existingAttempts.map((a) => this.ensureFresh(a, test)));
    const now = new Date().toISOString();
    const active = activeAttemptOf(
      freshened.map((a) => this.toAttemptLikeRow(a)),
      now,
    );
    if (active) {
      const activeFull = freshened.find((a) => a.id === active.id)!;
      return this.toAttemptDto(activeFull, test);
    }

    const attempt = await this.repo.createAttempt({
      testId: test.id,
      lessonId: test.lesson.id,
      studentId,
      expiresAt: new Date(Date.now() + test.timeLimitSec * 1000),
      totalQuestions: test.questions.length,
    });
    return this.toAttemptDto(attempt, test);
  }

  private async loadOwnAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<{ attempt: TestAttempt; test: FullTest }> {
    const attempt = await this.repo.findAttemptById(attemptId);
    if (!attempt) throw new NotFoundException("Попытка не найдена");
    // IDOR (TЗ, инвариант 1): чужая попытка — 403, не 404 (не палим существование чужих id).
    if (attempt.studentId !== studentId) throw new ForbiddenException("Доступ запрещён");
    const test = await this.repo.findFullById(attempt.testId);
    if (!test) throw new NotFoundException("Тест не найден");
    return { attempt: await this.ensureFresh(attempt, test), test };
  }

  async saveAnswer(
    studentId: string,
    attemptId: string,
    body: SaveAnswerRequestDto,
  ): Promise<TestAttemptDto> {
    await this.requireActiveAccess(studentId);
    const { attempt, test } = await this.loadOwnAttempt(studentId, attemptId);
    if (attempt.status !== "in_progress") throw new ForbiddenException("Попытка уже завершена");

    const answers = { ...(attempt.answers as Record<string, string[]>), [body.questionId]: body.optionIds };
    const updated = await this.repo.updateAnswers(attemptId, answers);
    return this.toAttemptDto(updated, test);
  }

  async submit(studentId: string, attemptId: string): Promise<TestAttemptDto> {
    await this.requireActiveAccess(studentId);
    const { attempt, test } = await this.loadOwnAttempt(studentId, attemptId);

    // Идемпотентно (BACKEND.md §7.3): повторный submit просто возвращает готовый результат.
    if (attempt.status === "in_progress") {
      const result = scoreAttempt(
        test.questions,
        attempt.answers as Record<string, string[]>,
        test.passingScore,
      );
      const submitted = await this.repo.submitAttempt(attemptId, {
        correctCount: result.correctCount,
        totalQuestions: result.total,
        score: result.score,
        passed: result.passed,
      });
      return this.toAttemptDto(submitted, test);
    }
    return this.toAttemptDto(attempt, test);
  }

  async getAttempt(studentId: string, attemptId: string): Promise<TestAttemptDto> {
    const { attempt, test } = await this.loadOwnAttempt(studentId, attemptId);
    return this.toAttemptDto(attempt, test);
  }
}
