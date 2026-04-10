-- Fix weeklyLoadLimit defaults per designation
-- ASSISTANT_PROFESSOR: 16 hrs, PROFESSOR: 14 hrs, HOD: 12 hrs

UPDATE "faculties" SET "weeklyLoadLimit" = 16 WHERE "designation" = 'ASSISTANT_PROFESSOR';
UPDATE "faculties" SET "weeklyLoadLimit" = 14 WHERE "designation" = 'PROFESSOR';
UPDATE "faculties" SET "weeklyLoadLimit" = 12 WHERE "designation" = 'HOD';

-- Also fix the column default for new rows (ASSISTANT_PROFESSOR is the default designation)
ALTER TABLE "faculties" ALTER COLUMN "weeklyLoadLimit" SET DEFAULT 16;
