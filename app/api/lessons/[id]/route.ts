import { prisma } from "@/lib/db"
import { updateLessonInIndex, deleteLessonFromIndex } from "@/lib/pgvector"
import { CreateLessonSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

// Get a single lesson
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const lessonId = resolvedParams.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 })
  }
}

// Update a lesson
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const lessonId = resolvedParams.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    const body = await request.json()

    // Validate request body (but courseId should come from existing lesson, not body)
    const { title, content, videoUrl } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    // Get existing lesson to get courseId
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    })

    if (!existingLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Update lesson
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        content,
        videoUrl: videoUrl || null,
      },
    })

    // Update lesson content in pgvector for AI retrieval
    try {
      await updateLessonInIndex(lesson.id, content, {
        lessonId: lesson.id,
        courseId: existingLesson.courseId,
        organizationId: existingLesson.course.organizationId,
        courseName: existingLesson.course.title,
        lessonTitle: lesson.title,
      })
    } catch (error) {
      console.error("Error updating lesson in pgvector:", error)
      // Don't fail the request if indexing fails, but log it
    }

    return NextResponse.json(lesson)
  } catch (error) {
    console.error("Error updating lesson:", error)
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 })
  }
}

// Delete a lesson
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const lessonId = resolvedParams.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    // Check if lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Delete from pgvector first
    try {
      await deleteLessonFromIndex(lessonId)
    } catch (error) {
      console.error("Error deleting lesson from pgvector:", error)
      // Continue with deletion even if pgvector deletion fails
    }

    // Delete lesson (cascade will handle related records)
    await prisma.lesson.delete({
      where: { id: lessonId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 })
  }
}


