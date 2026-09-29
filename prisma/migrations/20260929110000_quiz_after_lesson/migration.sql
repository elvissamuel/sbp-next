ALTER TABLE "Quiz" ADD COLUMN "afterLessonId" TEXT;

CREATE INDEX "Quiz_afterLessonId_idx" ON "Quiz"("afterLessonId");

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_afterLessonId_fkey" FOREIGN KEY ("afterLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
