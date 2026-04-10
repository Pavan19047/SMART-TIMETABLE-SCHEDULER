-- CreateEnum
CREATE TYPE "FacultyDesignation" AS ENUM ('ASSISTANT_PROFESSOR', 'PROFESSOR', 'HOD');

-- AlterTable: add designation column with default ASSISTANT_PROFESSOR and update weeklyLoadLimit default
ALTER TABLE "faculties" ADD COLUMN "designation" "FacultyDesignation" NOT NULL DEFAULT 'ASSISTANT_PROFESSOR';

-- Update weeklyLoadLimit for existing rows based on designation defaults
-- New default is 12 (ASSISTANT_PROFESSOR); existing rows keep their current weeklyLoadLimit
-- Only update if they still have the old default of 20 (treat those as ASSISTANT_PROFESSOR)
UPDATE "faculties" SET "weeklyLoadLimit" = 12 WHERE "weeklyLoadLimit" = 20;
