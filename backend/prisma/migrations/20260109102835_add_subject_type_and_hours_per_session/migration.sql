-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('THEORY', 'LAB');

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "hoursPerSession" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "type" "SubjectType" NOT NULL DEFAULT 'THEORY';
