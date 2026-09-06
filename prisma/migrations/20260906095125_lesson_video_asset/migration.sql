-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('none', 'processing', 'ready', 'failed');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "videoAssetId" TEXT,
ADD COLUMN     "videoDurationSec" INTEGER,
ADD COLUMN     "videoStatus" "VideoStatus" NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "Lesson_videoAssetId_idx" ON "Lesson"("videoAssetId");
