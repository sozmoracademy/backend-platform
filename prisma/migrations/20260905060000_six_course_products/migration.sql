-- DropForeignKey
ALTER TABLE "LessonTest" DROP CONSTRAINT "LessonTest_lessonOrder_fkey";

-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_lessonOrder_fkey";

-- DropForeignKey
ALTER TABLE "StudentLesson" DROP CONSTRAINT "StudentLesson_lessonOrder_fkey";

-- DropIndex
DROP INDEX "CourseProduct_language_format_key";

-- DropIndex
DROP INDEX "Lesson_order_key";

-- DropIndex
DROP INDEX "LessonTest_lessonOrder_key";

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "courseProductId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "courseProductId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LessonTest" DROP COLUMN "lessonOrder",
ADD COLUMN     "lessonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "lessonOrder",
ADD COLUMN     "lessonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StudentLesson" DROP CONSTRAINT "StudentLesson_pkey",
DROP COLUMN "lessonOrder",
ADD COLUMN     "lessonId" TEXT NOT NULL,
ADD CONSTRAINT "StudentLesson_pkey" PRIMARY KEY ("studentId", "lessonId");

-- AlterTable
ALTER TABLE "TestAttempt" DROP COLUMN "lessonOrder",
ADD COLUMN     "lessonId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CourseProduct_language_format_durationMonths_key" ON "CourseProduct"("language", "format", "durationMonths");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseProductId_order_key" ON "Lesson"("courseProductId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LessonTest_lessonId_key" ON "LessonTest"("lessonId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseProductId_fkey" FOREIGN KEY ("courseProductId") REFERENCES "CourseProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_courseProductId_fkey" FOREIGN KEY ("courseProductId") REFERENCES "CourseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLesson" ADD CONSTRAINT "StudentLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTest" ADD CONSTRAINT "LessonTest_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

