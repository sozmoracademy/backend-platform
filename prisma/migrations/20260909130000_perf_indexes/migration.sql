-- Индексы под фактические запросы кабинета куратора (perf).

-- CreateIndex
-- Список учеников и CSV-экспорт всегда идут `ORDER BY "createdAt" DESC`.
CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");

-- CreateIndex
-- Счётчики в редакторе урока (countCompleted / countInProgress) фильтруют по
-- одному "lessonId"; в составном PK ("studentId","lessonId") это вторая колонка.
CREATE INDEX "StudentLesson_lessonId_idx" ON "StudentLesson"("lessonId");

-- CreateIndex
-- Каталог курса (ordersWithPractice) джойнит Meeting по "lessonId".
CREATE INDEX "Meeting_lessonId_idx" ON "Meeting"("lessonId");
