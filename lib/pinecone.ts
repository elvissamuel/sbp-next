import { Pinecone } from "@pinecone-database/pinecone"
import { google } from "@ai-sdk/google"
import { embedMany } from "ai"

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_INDEX = process.env.PINECONE_INDEX || "lms-content"

if (!PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY environment variable is not set")
}

let pineconeClient: Pinecone | null = null

export function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    })
  }
  return pineconeClient
}

// Generate embeddings for lesson content
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

// Index lesson content to Pinecone
export async function indexLessonContent(lessonId: string, content: string, metadata: Record<string, any>) {
  try {
    const client = getPineconeClient()
    const index = client.Index(PINECONE_INDEX)

    // Generate embedding
    const embedding = await generateEmbeddings(content)

    // Upsert to Pinecone
    await index.upsert([
      {
        id: lessonId,
        values: embedding,
        metadata: {
          ...metadata,
          content: content.substring(0, 500), // Store truncated content
          indexed_at: new Date().toISOString(),
        },
      },
    ])

    console.log(`Indexed lesson ${lessonId} to Pinecone`)
  } catch (error) {
    console.error("Error indexing lesson content:", error)
    throw error
  }
}

// Search similar lessons
export async function searchSimilarLessons(query: string, topK = 5, filter?: Record<string, any>) {
  try {
    const client = getPineconeClient()
    const index = client.Index(PINECONE_INDEX)

    // Generate embedding for query
    const embedding = await generateEmbeddings(query)

    // Query Pinecone
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,
    })

    return results.matches.map((match) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata,
    }))
  } catch (error) {
    console.error("Error searching similar lessons:", error)
    throw error
  }
}

// Delete lesson from Pinecone
export async function deleteLessonFromIndex(lessonId: string) {
  try {
    const client = getPineconeClient()
    const index = client.Index(PINECONE_INDEX)

    await index.deleteOne(lessonId)
    console.log(`Deleted lesson ${lessonId} from Pinecone`)
  } catch (error) {
    console.error("Error deleting lesson from Pinecone:", error)
    throw error
  }
}

// Update lesson in Pinecone
export async function updateLessonInIndex(lessonId: string, content: string, metadata: Record<string, any>) {
  try {
    await deleteLessonFromIndex(lessonId)
    await indexLessonContent(lessonId, content, metadata)
  } catch (error) {
    console.error("Error updating lesson in Pinecone:", error)
    throw error
  }
}

// Index resource content to Pinecone
export async function indexResourceContent(
  resourceId: string,
  content: string,
  metadata: Record<string, any>
) {
  try {
    const client = getPineconeClient()
    const index = client.Index(PINECONE_INDEX)

    // Generate embedding
    const embedding = await generateEmbeddings(content)

    // Upsert to Pinecone with resource prefix
    await index.upsert([
      {
        id: `resource-${resourceId}`,
        values: embedding,
        metadata: {
          ...metadata,
          type: "resource",
          content: content.substring(0, 500), // Store truncated content
          indexed_at: new Date().toISOString(),
        },
      },
    ])

    console.log(`Indexed resource ${resourceId} to Pinecone`)
  } catch (error) {
    console.error("Error indexing resource content:", error)
    throw error
  }
}
