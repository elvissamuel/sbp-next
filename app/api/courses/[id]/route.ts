import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get a single course
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    // Handle both sync and async params (Next.js 13+ vs 15+)
    const resolvedParams = await Promise.resolve(params)
    const courseId = resolvedParams.id

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: { orderBy: { order: "asc" } },
        quizzes: {
          include: {
            attempts: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        resources: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Calculate stats from enrollments
    const enrollmentsCount = course.enrollments.length
    const completedCount = course.enrollments.filter(e => e.status === "completed" || e.progress === 100).length
    const completionRate = enrollmentsCount > 0 ? Math.round((completedCount / enrollmentsCount) * 100) : 0

    // Calculate average quiz score for all quizzes in this course
    const allQuizAttempts = course.quizzes.flatMap(quiz => quiz.attempts)
    const avgScore = allQuizAttempts.length > 0
      ? Math.round((allQuizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / allQuizAttempts.length))
      : 0

    return NextResponse.json({
      ...course,
      stats: {
        enrollments: enrollmentsCount,
        completionRate,
        avgScore,
      },
    })
  } catch (error) {
    console.error("Error fetching course:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}

// Update a course
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const courseId = resolvedParams.id

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const updates = await request.json()

    const course = await prisma.course.update({
      where: { id: courseId },
      data: updates,
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error("Error updating course:", error)
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 })
  }
}

// Delete a course
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const courseId = resolvedParams.id

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    await prisma.course.delete({
      where: { id: courseId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting course:", error)
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 })
  }
}
