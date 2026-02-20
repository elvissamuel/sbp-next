-- Drop the existing unique constraint on slug
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_slug_key";

-- Add composite unique constraint on (organizationId, slug)
CREATE UNIQUE INDEX "Course_organizationId_slug_key" ON "Course"("organizationId", "slug");

