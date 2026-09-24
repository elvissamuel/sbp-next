-- Organization library resources are no longer required to belong to a course.
ALTER TABLE "CourseResource" ADD COLUMN "organizationId" TEXT;

UPDATE "CourseResource" AS cr
SET "organizationId" = c."organizationId"
FROM "Course" AS c
WHERE cr."courseId" = c."id"
  AND cr."organizationId" IS NULL;

DELETE FROM "CourseResource" WHERE "organizationId" IS NULL;

ALTER TABLE "CourseResource" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "CourseResource" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "CourseResource"
ADD CONSTRAINT "CourseResource_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CourseResource_organizationId_idx" ON "CourseResource"("organizationId");

ALTER TABLE "CourseResource" DROP CONSTRAINT "CourseResource_courseId_fkey";

ALTER TABLE "CourseResource"
ADD CONSTRAINT "CourseResource_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
