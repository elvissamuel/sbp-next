/*
  Warnings:

  - You are about to drop the column `googleSlidesUrl` on the `Lesson` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "googleSlidesUrl",
ADD COLUMN     "reflectionQuestion" TEXT;
