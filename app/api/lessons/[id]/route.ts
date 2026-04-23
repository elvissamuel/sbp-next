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

    const userId = request.nextUrl.searchParams.get("userId")

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    // Enforce course deadline for learners
    // We only enforce when userId is provided by the classroom.
    const courseDeadline = (lesson.course as any)?.deadline as Date | null | undefined
    if (userId && courseDeadline && new Date(courseDeadline).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Course deadline has passed. You can no longer take this course.", expired: true, deadline: courseDeadline },
        { status: 403 }
      )
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

    // Get existing lesson to get courseId
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    })

    if (!existingLesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const { title, content, slides, videoUrl, reflectionQuestion, status } = body

    // Build update data object with only provided fields
    const updateData: {
      title?: string
      content?: string
      slides?: any
      videoUrl?: string | null
      reflectionQuestion?: string | null
      status?: string
    } = {}

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (slides !== undefined) updateData.slides = slides ? (slides as any) : null
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null
    if (reflectionQuestion !== undefined) updateData.reflectionQuestion = reflectionQuestion || null
    if (status !== undefined) updateData.status = status

    // Prepare content for indexing
    let contentForIndexing = content
    if (contentForIndexing === undefined && slides) {
      // Extract text from slides for indexing
      if (slides.slides && Array.isArray(slides.slides)) {
        contentForIndexing = slides.slides
          .map((slide: any) => slide.title || "")
          .filter(Boolean)
          .join(" ")
      }
    }

    // Update lesson
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
    })

    // Update lesson content in pgvector for AI retrieval (only if content or slides were updated)
    if (content !== undefined || slides !== undefined) {
      try {
        const finalContent = contentForIndexing || lesson.content || ""
        await updateLessonInIndex(lesson.id, finalContent, {
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


