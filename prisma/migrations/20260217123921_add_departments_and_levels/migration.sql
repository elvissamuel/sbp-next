/*
  Warnings:

  - Added the required column `updatedAt` to the `OrganizationMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add updatedAt with a default value for existing rows
ALTER TABLE "OrganizationMember" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to use joinedAt as the initial updatedAt value
UPDATE "OrganizationMember" SET "updatedAt" = "joinedAt" WHERE "updatedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Level_organizationId_idx" ON "Level"("organizationId");

-- CreateIndex
CREATE INDEX "Level_organizationId_levelNumber_idx" ON "Level"("organizationId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Level_organizationId_levelNumber_key" ON "Level"("organizationId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Level_organizationId_name_key" ON "Level"("organizationId", "name");

-- CreateIndex
CREATE INDEX "OrganizationMember_departmentId_idx" ON "OrganizationMember"("departmentId");

-- CreateIndex
CREATE INDEX "OrganizationMember_levelId_idx" ON "OrganizationMember"("levelId");

-- CreateIndex
CREATE INDEX "OrganizationMember_managerId_idx" ON "OrganizationMember"("managerId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "OrganizationMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
