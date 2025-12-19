import { generateQuizQuestions } from "@/lib/ai"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { courseId, lessonContent, numQuestions = 5 } = await request.json()

    if (!courseId || !lessonContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Generate quiz questions
    const questions = await generateQuizQuestions(lessonContent, numQuestions)

    // Create quiz
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title: `Quiz - ${course.title}`,
        description: "Auto-generated quiz",
        totalPoints: questions.length,
        passingScore: Math.ceil((questions.length * 70) / 100),
        questions: {
          create: questions.map((q, index) => ({
            question: q.question,
            type: q.type,
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
        prompt: lessonContent.substring(0, 100),
        output: JSON.stringify(questions),
        tokensUsed: Math.ceil((lessonContent.length + JSON.stringify(questions).length) / 4),
      },
    })

    return NextResponse.json({ quiz })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
