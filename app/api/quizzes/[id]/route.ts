import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get a single quiz with questions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const quizId = resolvedParams.id

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error("Error fetching quiz:", error)
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 })
  }
}

// Update a quiz
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const quizId = resolvedParams.id

    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { title, description, status } = body

    // Get existing quiz
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Build update data object with only provided fields
    const updateData: {
      title?: string
      description?: string | null
      status?: string
    } = {}

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (status !== undefined) updateData.status = status

    // Update quiz
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
    })

    return NextResponse.json(quiz)
  } catch (error) {
    console.error("Error updating quiz:", error)
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 })
  }
}

