-- AlterTable
ALTER TABLE "registration_rounds"
ADD COLUMN IF NOT EXISTS "maxStudentsPerTopic" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS "minTopicsPerLecturer" INTEGER;
