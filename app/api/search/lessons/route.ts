import { searchSimilarLessons } from "@/lib/pgvector"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query, courseId, topK = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    // Search similar lessons
    const results = await searchSimilarLessons(query, topK, courseId ? { courseId } : undefined)

    return NextResponse.json({
      query,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("Error searching lessons:", error)
    return NextResponse.json({ error: "Failed to search lessons" }, { status: 500 })
  }
}
