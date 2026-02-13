-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Embeddings" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Embeddings_entityType_entityId_key" ON "Embeddings"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Embeddings_entityType_entityId_idx" ON "Embeddings"("entityType", "entityId");

-- CreateIndex for vector similarity search
CREATE INDEX IF NOT EXISTS "Embeddings_embedding_idx" ON "Embeddings" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

