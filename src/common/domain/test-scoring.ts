export interface ScoringOption {
  id: string;
  isCorrect: boolean;
}

export interface ScoringQuestion {
  id: string;
  options: ScoringOption[];
}

export interface ScoreResult {
  correctCount: number;
  total: number;
  score: number;
  passed: boolean;
}

/**
 * Порт скоринга из `submitAttempt` (`store.tsx`) — BACKEND.md §6/§7.3, ТЗ инвариант 9.
 * `multiple` — верно только при точном совпадении множеств правильных/выбранных id;
 * `score = round(correct/total*100)`; `passed = score >= passingScore`.
 */
export function scoreAttempt(
  questions: ScoringQuestion[],
  answers: Record<string, string[]>,
  passingScore: number,
): ScoreResult {
  const correctCount = questions.reduce((sum, q) => {
    const correctIds = q.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id)
      .sort();
    const givenIds = [...(answers[q.id] ?? [])].sort();
    const isCorrect = correctIds.length === givenIds.length && correctIds.every((id, i) => id === givenIds[i]);
    return sum + (isCorrect ? 1 : 0);
  }, 0);
  const total = questions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { correctCount, total, score, passed: score >= passingScore };
}
