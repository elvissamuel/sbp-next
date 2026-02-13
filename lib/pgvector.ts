import { prisma } from "@/lib/prisma"
import { google } from "@ai-sdk/google"
import { embedMany } from "ai"
import { PrismaClient } from "@prisma/client"

// Set the API key in the environment if we have GEMINI_API_KEY but not GOOGLE_GENERATIVE_AI_API_KEY
if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
}

// Generate embeddings for content
export async function generateEmbeddings(content: string): Promise<number[]> {
  try {
    const results = await embedMany({
      model: google.textEmbedding("models/text-embedding-004"),
      values: [content],
    })

    return results.embeddings[0]
  } catch (error) {
    console.error("Error generating embeddings:", error)
    throw error
  }
}


// Index content to pgvector
export async function indexContent(
  entityType: "lesson" | "resource",
  entityId: string,
  content: string,
  metadata?: Record<string, any>
) {
  try {
    // Generate embedding
    const embedding = await generateEmbeddings(content)

    // Convert to pgvector format string (PostgreSQL array format)
    const embeddingVector = `[${embedding.join(",")}]`

    // Use raw SQL to insert with vector type
    // Prisma doesn't natively support pgvector's vector type, so we use raw SQL
    // Use ON CONFLICT with the unique constraint
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "Embeddings" (id, "entityType", "entityId", content, embedding, metadata, "createdAt")
      VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, NOW())
      ON CONFLICT ("entityType", "entityId") 
      DO UPDATE SET 
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        "createdAt" = NOW()
    `,
      `${entityType}-${entityId}`, // Use composite key for id
      entityType,
      entityId,
      content,
      embeddingVector,
      metadata ? JSON.stringify(metadata) : null
    )

    // Also store metadata in Prisma model for easier querying (without embedding field)
    const embeddingId = `${entityType}-${entityId}`
    await prisma.embedding.upsert({
      where: { id: embeddingId },
      create: {
        id: embeddingId,
        entityType,
        entityId,
        content: content.substring(0, 1000), // Store truncated content for display
        metadata: metadata || {},
      },
      update: {
        content: content.substring(0, 1000),
        metadata: metadata || {},
        createdAt: new Date(),
      },
    })

    console.log(`Indexed ${entityType} ${entityId} to pgvector`)
  } catch (error) {
    console.error(`Error indexing ${entityType} content:`, error)
    throw error
  }
}

// Search similar content using pgvector
export async function searchSimilarContent(
  query: string,
  entityType?: "lesson" | "resource",
  topK = 5,
  organizationId?: string,
  courseId?: string
) {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbeddings(query)
    const queryVector = `[${queryEmbedding.join(",")}]`

    // Build filter conditions dynamically
    let whereConditions: string[] = []
    const params: any[] = [queryVector, topK]
    let paramIndex = 3

    if (entityType) {
      whereConditions.push(`"entityType" = $${paramIndex}`)
      params.push(entityType)
      paramIndex++
    }

    if (organizationId) {
      whereConditions.push(`metadata->>'organizationId' = $${paramIndex}`)
      params.push(organizationId)
      paramIndex++
    }

    if (courseId) {
      whereConditions.push(`metadata->>'courseId' = $${paramIndex}`)
      params.push(courseId)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(" AND ")}`
      : ""

    // Use cosine distance (<=>) for vector search, convert to similarity score
    // <=> returns cosine distance (0 = identical, 2 = opposite)
    // similarity = 1 - distance
    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        id,
        "entityType",
        "entityId",
        content,
        metadata,
        (1 - (embedding <=> $1::vector)) as similarity
      FROM "Embeddings"
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
      ...params
    )

    return results.map((result) => ({
      id: result.entityId,
      entityType: result.entityType,
      score: parseFloat(result.similarity),
      content: result.content,
      metadata: result.metadata,
    }))
  } catch (error) {
    console.error("Error searching similar content:", error)
    throw error
  }
}

// Delete content from vector store
export async function deleteFromIndex(entityId: string, entityType?: "lesson" | "resource") {
  try {
    // If entityType is provided, use composite key
    if (entityType) {
      const embeddingId = `${entityType}-${entityId}`
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Embeddings" WHERE id = $1`,
        embeddingId
      )
      await prisma.embedding.deleteMany({
        where: { id: embeddingId },
      })
    } else {
      // Otherwise try to delete by entityId (matches either type)
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Embeddings" WHERE "entityId" = $1`,
        entityId
      )
      await prisma.embedding.deleteMany({
        where: { entityId },
      })
    }

    console.log(`Deleted ${entityId} from pgvector index`)
  } catch (error) {
    console.error("Error deleting from pgvector index:", error)
    throw error
  }
}

// Update content in vector store
export async function updateContentInIndex(
  entityType: "lesson" | "resource",
  entityId: string,
  content: string,
  metadata?: Record<string, any>
) {
  try {
    // Delete old entry
    await deleteFromIndex(entityId, entityType)
    // Insert new entry
    await indexContent(entityType, entityId, content, metadata)
  } catch (error) {
    console.error("Error updating content in pgvector index:", error)
    throw error
  }
}

// Legacy function names for backward compatibility
export async function indexLessonContent(
  lessonId: string,
  content: string,
  metadata: Record<string, any>
) {
  return indexContent("lesson", lessonId, content, metadata)
}

export async function indexResourceContent(
  resourceId: string,
  content: string,
  metadata: Record<string, any>
) {
  return indexContent("resource", resourceId, content, metadata)
}

export async function searchSimilarLessons(
  query: string,
  topK = 5,
  filter?: Record<string, any>
) {
  return searchSimilarContent(
    query,
    "lesson",
    topK,
    filter?.organizationId,
    filter?.courseId
  )
}

export async function deleteLessonFromIndex(lessonId: string) {
  return deleteFromIndex(lessonId)
}

export async function updateLessonInIndex(
  lessonId: string,
  content: string,
  metadata: Record<string, any>
) {
  return updateContentInIndex("lesson", lessonId, content, metadata)
}

