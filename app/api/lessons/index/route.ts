import { prisma } from "@/lib/db"
import { indexLessonContent } from "@/lib/pgvector"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { lessonId } = await request.json()

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    // Fetch lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Index to pgvector
    await indexLessonContent(lesson.id, lesson.content, {
      lessonId: lesson.id,
      courseId: lesson.courseId,
      organizationId: lesson.course.organizationId,
      courseName: lesson.course.title,
      lessonTitle: lesson.title,
    })

    return NextResponse.json({
      success: true,
      message: "Lesson indexed successfully",
    })
  } catch (error) {
    console.error("Error indexing lesson:", error)
    return NextResponse.json({ error: "Failed to index lesson" }, { status: 500 })
  }
}
