import { prisma } from "@/lib/db"
import { indexLessonContent } from "@/lib/pgvector"
import { CreateLessonSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

// Create a new lesson
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body with zod schema
    const validationResult = CreateLessonSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { courseId, title, content, resourceIds } = validationResult.data

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { lessons: true },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get the next order number
    const nextOrder = course.lessons.length

    // Create lesson
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        content,
        order: nextOrder,
      },
    })

    // Index lesson content to pgvector for AI retrieval
    try {
      await indexLessonContent(lesson.id, content, {
        lessonId: lesson.id,
        courseId: course.id,
        organizationId: course.organizationId,
        courseName: course.title,
        lessonTitle: lesson.title,
        resourceIds: resourceIds || [],
      })
    } catch (error) {
      console.error("Error indexing lesson to pgvector:", error)
      // Don't fail the request if indexing fails, but log it
    }

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    console.error("Error creating lesson:", error)
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
  }
}

