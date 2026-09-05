import { scoreAttempt } from "./test-scoring";

const questions = [
  {
    id: "q1",
    options: [
      { id: "o1", isCorrect: true },
      { id: "o2", isCorrect: false },
    ],
  },
  {
    id: "q2",
    options: [
      { id: "o3", isCorrect: true },
      { id: "o4", isCorrect: true },
      { id: "o5", isCorrect: false },
    ],
  },
];

describe("scoreAttempt", () => {
  it("single: верен только правильный вариант", () => {
    const result = scoreAttempt(questions, { q1: ["o1"], q2: ["o3", "o4"] }, 70);
    expect(result).toEqual({ correctCount: 2, total: 2, score: 100, passed: true });
  });

  it("multiple: верно только при точном совпадении множеств (частичный ответ — неверно)", () => {
    const result = scoreAttempt(questions, { q1: ["o1"], q2: ["o3"] }, 70);
    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it("multiple: лишний неверный вариант в ответе — неверно", () => {
    const result = scoreAttempt(questions, { q1: ["o1"], q2: ["o3", "o4", "o5"] }, 70);
    expect(result.correctCount).toBe(1);
  });

  it("нет ответа на вопрос — засчитывается как неверный", () => {
    const result = scoreAttempt(questions, { q1: ["o1"] }, 70);
    expect(result.correctCount).toBe(1);
    expect(result.score).toBe(50);
  });

  it("passed = score >= passingScore (граница)", () => {
    const result = scoreAttempt(questions, { q1: ["o1"], q2: ["o3"] }, 50);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it("total=0 → score=0, без деления на ноль", () => {
    expect(scoreAttempt([], {}, 70)).toEqual({ correctCount: 0, total: 0, score: 0, passed: false });
  });
});
