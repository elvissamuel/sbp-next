-- Add Google Slides embed URL to lessons
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "googleSlidesUrl" TEXT;

