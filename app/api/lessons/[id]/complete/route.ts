import { prisma } from "@/lib/db"
import { updateEnrollmentProgress } from "@/lib/progress-calculator"
import { type NextRequest, NextResponse } from "next/server"

// Mark a lesson as complete and update enrollment progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const lessonId = resolvedParams.id

    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required" }, { status: 400 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get the lesson to find the course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const courseDeadline = (lesson.course as any)?.deadline as Date | null | undefined
    if (courseDeadline && new Date(courseDeadline).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Course deadline has passed. You can no longer take this course.", expired: true, deadline: courseDeadline },
        { status: 403 }
      )
    }

    // Get or create enrollment
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.courseId,
        },
      },
    })

    if (!enrollment) {
      // Create enrollment if it doesn't exist
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId: lesson.courseId,
          status: "active",
          progress: 0,
        },
      })
    }

    const totalLessons = lesson.course.lessons.length
    if (totalLessons === 0) {
      return NextResponse.json({ error: "Course has no lessons" }, { status: 400 })
    }

    await prisma.lessonCompletion.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
      },
      update: {},
    })

    const progressData = await updateEnrollmentProgress(userId, lesson.courseId)

    return NextResponse.json({
      success: true,
      enrollment: {
        ...enrollment,
        progress: progressData.progress,
      },
      progress: progressData.progress,
      completedLessons: progressData.completedLessons,
      totalLessons: progressData.totalLessons,
      quizProgress: progressData.quizProgress,
    })
  } catch (error) {
    console.error("Error marking lesson as complete:", error)
    return NextResponse.json({ error: "Failed to mark lesson as complete" }, { status: 500 })
  }
}

