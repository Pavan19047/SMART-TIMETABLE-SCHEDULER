-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "conceptsCovered" JSONB,
ADD COLUMN     "courseDurationWeeks" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "totalHoursRequired" INTEGER NOT NULL DEFAULT 48;
