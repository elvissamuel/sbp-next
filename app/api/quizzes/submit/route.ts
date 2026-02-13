import { prisma } from "@/lib/db"
import { updateEnrollmentProgress } from "@/lib/progress-calculator"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, quizId, answers } = await request.json()

    if (!userId || !quizId || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Fetch quiz with questions and course info
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        course: true,
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Calculate score
    let score = 0
    const answersObj = typeof answers === "string" ? JSON.parse(answers) : answers

    for (const question of quiz.questions) {
      const userAnswer = answersObj[question.id]
      const correctAnswer = question.correctAnswer

      if (userAnswer === correctAnswer) {
        score += question.points
      }
    }

    // Check if passed
    const passed = score >= quiz.passingScore

    // Create attempt record
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers: JSON.stringify(answersObj),
        score,
        passed,
      },
    })

    // Update course progress (includes quiz performance)
    const progressData = await updateEnrollmentProgress(userId, quiz.courseId)

    return NextResponse.json({
      attempt,
      passed,
      score,
      totalPoints: quiz.totalPoints,
      progress: progressData.progress,
      quizProgress: progressData.quizProgress,
    })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 })
  }
}
