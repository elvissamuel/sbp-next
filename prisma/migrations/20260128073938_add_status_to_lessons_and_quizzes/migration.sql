-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';
