-- Course modules, and one default module for every existing course
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");

ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Module" ("id", "courseId", "title", "order", "createdAt", "updatedAt")
SELECT 'mod_' || "id", "id", 'Module 1', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Course";

ALTER TABLE "Lesson" ADD COLUMN "moduleId" TEXT;

UPDATE "Lesson"
SET "moduleId" = 'mod_' || "courseId";

ALTER TABLE "Lesson" ALTER COLUMN "moduleId" SET NOT NULL;

CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonCompletion_enrollmentId_lessonId_key" ON "LessonCompletion"("enrollmentId", "lessonId");
CREATE INDEX "LessonCompletion_enrollmentId_idx" ON "LessonCompletion"("enrollmentId");
CREATE INDEX "LessonCompletion_lessonId_idx" ON "LessonCompletion"("lessonId");

ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep existing progress by marking the first N lessons complete
WITH ranked AS (
    SELECT
        e."id" AS enrollment_id,
        l."id" AS lesson_id,
        ROW_NUMBER() OVER (PARTITION BY e."id" ORDER BY l."order" ASC) AS rn,
        GREATEST(
            0,
            ROUND(
                (e."progress"::numeric / 100.0) * COUNT(*) OVER (PARTITION BY e."id")
            )::int
        ) AS keep_count
    FROM "Enrollment" e
    JOIN "Lesson" l ON l."courseId" = e."courseId"
)
INSERT INTO "LessonCompletion" ("id", "enrollmentId", "lessonId", "completedAt")
SELECT
    'lc_' || enrollment_id || '_' || lesson_id,
    enrollment_id,
    lesson_id,
    CURRENT_TIMESTAMP
FROM ranked
WHERE rn <= keep_count AND keep_count > 0;
