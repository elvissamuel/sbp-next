import { prisma } from "@/lib/db"
import { generateQuizQuestions } from "@/lib/ai"
import { CreateQuizSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

// Create a new quiz
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body with zod schema
    const validationResult = CreateQuizSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { courseId, title, description, status, quizType, numQuestions, resourceIds, lessonIds } = validationResult.data

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Fetch reference lessons if provided (priority: lessons > resources > course description)
    let referenceContent: string[] = []
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
      const lessons = await prisma.lesson.findMany({
        where: {
          id: { in: lessonIds },
          courseId: courseId,
        },
        select: { title: true, content: true },
        orderBy: { order: "asc" },
      })
      
      // Combine lesson title and content for better context
      referenceContent = lessons
        .filter((l) => l.content)
        .map((l) => `Lesson: ${l.title}\n\n${l.content}`)
    } else if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      // Fallback to resources if no lessons are selected
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

    // Combine reference content for AI generation, fallback to course description
    const combinedContent = referenceContent.length > 0 
      ? referenceContent.join("\n\n")
      : course.description || `${course.title} course content`

    // Generate quiz questions using AI
    const questions = await generateQuizQuestions(combinedContent, numQuestions)

    // Calculate points
    const totalPoints = questions.length
    const passingScore = Math.ceil((totalPoints * 70) / 100)

    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title,
        description: description || undefined,
        totalPoints,
        passingScore,
        questions: {
          create: questions.map((q, index) => ({
            question: q.question,
            type: quizType || q.type || "multiple_choice",
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            points: 1,
            order: index,
          })),
        },
      },
      include: { questions: true },
    })

    // Log generation
    await prisma.contentGeneration.create({
      data: {
        organizationId: course.organizationId,
        courseId,
        type: "quiz_questions",
        prompt: title,
        output: JSON.stringify(questions),
        tokensUsed: Math.ceil((combinedContent.length + JSON.stringify(questions).length) / 4),
      },
    })

    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    console.error("Error creating quiz:", error)
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 })
  }
}

