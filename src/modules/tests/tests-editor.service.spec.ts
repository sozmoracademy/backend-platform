import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TestsEditorService } from "./tests-editor.service";
import type { TestsRepository } from "./tests.repository";

function makeService(repo: Partial<TestsRepository>) {
  return new TestsEditorService(repo as TestsRepository);
}

describe("TestsEditorService.library", () => {
  it("маппит тесты-доноры в плоские строки с языком/длительностью продукта", async () => {
    const findAllTestsForLibrary = jest.fn().mockResolvedValue([
      {
        id: "test-1",
        title: "Тест к уроку 1",
        status: "published",
        timeLimitSec: 300,
        passingScore: 70,
        _count: { questions: 4 },
        lesson: {
          id: "lesson-1",
          order: 1,
          title: "Present Simple",
          courseProduct: {
            id: "en-group-3mo",
            title: "English · 3 месяца",
            language: "en",
            format: "GROUP",
            durationMonths: 3,
          },
        },
      },
    ]);
    const service = makeService({ findAllTestsForLibrary });

    await expect(service.library()).resolves.toEqual([
      {
        productId: "en-group-3mo",
        productTitle: "English · 3 месяца",
        language: "en",
        format: "GROUP",
        durationMonths: 3,
        lessonId: "lesson-1",
        lessonOrder: 1,
        lessonTitle: "Present Simple",
        testId: "test-1",
        testTitle: "Тест к уроку 1",
        status: "published",
        questionCount: 4,
      },
    ]);
  });
});

describe("TestsEditorService.copyFrom", () => {
  const sourceTest = {
    id: "test-src",
    lessonId: "lesson-src",
    title: "Тест-донор",
    timeLimitSec: 600,
    passingScore: 80,
    status: "published",
    questions: [
      {
        id: "q1",
        text: "2 + 2 = ?",
        type: "single",
        order: 1,
        options: [
          { id: "o1", text: "4", isCorrect: true },
          { id: "o2", text: "3", isCorrect: false },
        ],
      },
    ],
  };

  it("404, если целевого урока нет", async () => {
    const service = makeService({ findLessonById: jest.fn().mockResolvedValue(null) });
    await expect(service.copyFrom("lesson-dst", { sourceLessonId: "lesson-src" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("400, если донор совпадает с целью", async () => {
    const service = makeService({ findLessonById: jest.fn().mockResolvedValue({ id: "lesson-dst" }) });
    await expect(service.copyFrom("lesson-dst", { sourceLessonId: "lesson-dst" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("404, если у урока-донора нет теста", async () => {
    const service = makeService({
      findLessonById: jest.fn().mockResolvedValue({ id: "lesson-dst" }),
      findFullByLessonId: jest.fn().mockResolvedValue(null),
    });
    await expect(service.copyFrom("lesson-dst", { sourceLessonId: "lesson-src" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("400, если тест-донор без вопросов", async () => {
    const service = makeService({
      findLessonById: jest.fn().mockResolvedValue({ id: "lesson-dst" }),
      findFullByLessonId: jest.fn().mockResolvedValue({ ...sourceTest, questions: [] }),
    });
    await expect(service.copyFrom("lesson-dst", { sourceLessonId: "lesson-src" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("создаёт тест у целевого урока, если его нет, и переносит вопросы/варианты", async () => {
    const createdTarget = { id: "test-dst", questions: [], lesson: { id: "lesson-dst", order: 2 } };
    const findFullByLessonId = jest
      .fn()
      .mockResolvedValueOnce(sourceTest) // донор
      .mockResolvedValueOnce(null); // у цели теста ещё нет
    const createTest = jest.fn().mockResolvedValue({ id: "test-dst" });
    const replaceTestContent = jest.fn().mockResolvedValue(undefined);
    const findFullById = jest
      .fn()
      .mockResolvedValueOnce(createdTarget) // loadTestOrThrow после createTest
      .mockResolvedValueOnce({
        ...createdTarget,
        title: "Тест-донор",
        timeLimitSec: 600,
        passingScore: 80,
        status: "draft",
        questions: sourceTest.questions,
      });
    const service = makeService({
      findLessonById: jest.fn().mockResolvedValue({ id: "lesson-dst" }),
      findFullByLessonId,
      createTest,
      replaceTestContent,
      findFullById,
    });

    const dto = await service.copyFrom("lesson-dst", { sourceLessonId: "lesson-src" });

    expect(createTest).toHaveBeenCalledWith({ lessonId: "lesson-dst", title: "Тест-донор" });
    expect(replaceTestContent).toHaveBeenCalledWith("test-dst", {
      timeLimitSec: 600,
      passingScore: 80,
      questions: [
        {
          text: "2 + 2 = ?",
          type: "single",
          order: 1,
          options: [
            { text: "4", isCorrect: true },
            { text: "3", isCorrect: false },
          ],
        },
      ],
    });
    expect(dto.id).toBe("test-dst");
    expect(dto.questions).toHaveLength(1);
  });

  it("заменяет вопросы уже существующего теста целевого урока", async () => {
    const existingTarget = {
      id: "test-dst",
      questions: [{ id: "old" }],
      lesson: { id: "lesson-dst", order: 2 },
    };
    const findFullByLessonId = jest
      .fn()
      .mockResolvedValueOnce(sourceTest)
      .mockResolvedValueOnce(existingTarget);
    const createTest = jest.fn();
    const replaceTestContent = jest.fn().mockResolvedValue(undefined);
    const findFullById = jest.fn().mockResolvedValue({
      ...existingTarget,
      title: "existing",
      timeLimitSec: 600,
      passingScore: 80,
      status: "published",
      questions: sourceTest.questions,
    });
    const service = makeService({
      findLessonById: jest.fn().mockResolvedValue({ id: "lesson-dst" }),
      findFullByLessonId,
      createTest,
      replaceTestContent,
      findFullById,
    });

    await service.copyFrom("lesson-dst", { sourceLessonId: "lesson-src" });

    expect(createTest).not.toHaveBeenCalled();
    expect(replaceTestContent).toHaveBeenCalledWith(
      "test-dst",
      expect.objectContaining({ passingScore: 80 }),
    );
  });
});
