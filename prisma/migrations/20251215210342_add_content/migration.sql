/*
  Warnings:

  - You are about to drop the column `secret` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `Embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `paystackAccessCode` on the `Payment` table. All the data in the column will be lost.
  - The `metadata` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `LessonEmbedding` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `permissions` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LessonEmbedding" DROP CONSTRAINT "LessonEmbedding_lessonId_fkey";

-- DropIndex
DROP INDEX "Embeddings_embedding_idx";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "secret",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "permissions" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ContentGeneration" ALTER COLUMN "tokensUsed" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Embeddings" DROP COLUMN "embedding";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "description",
DROP COLUMN "paystackAccessCode",
ALTER COLUMN "status" DROP DEFAULT,
DROP COLUMN "metadata",
ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "LessonEmbedding";
