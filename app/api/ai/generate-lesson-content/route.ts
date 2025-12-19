import { generateLessonContent } from "@/lib/ai"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { courseId, topic, resourceIds } = await request.json()

    if (!courseId || !topic) {
      return NextResponse.json({ error: "Course ID and topic are required" }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch reference resources if provided
    let referenceContent: string[] = []
    if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      const resources = await prisma.courseResource.findMany({
        where: {
          id: { in: resourceIds },
          courseId: courseId,
        },
        select: { content: true },
      })
      
      referenceContent = resources
        .filter((r) => r.content)
        .map((r) => r.content as string)
    }

    // Generate content with references
    const content = await generateLessonContent(topic, course.level || "beginner", referenceContent)

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error generating lesson content:", error)
    return NextResponse.json({ error: "Failed to generate lesson content" }, { status: 500 })
  }
}

