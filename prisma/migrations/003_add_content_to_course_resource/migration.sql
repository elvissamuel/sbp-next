-- AlterTable
-- Make url nullable
ALTER TABLE "CourseResource" ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
-- Add content column for text/pasted content
ALTER TABLE "CourseResource" ADD COLUMN "content" TEXT;

