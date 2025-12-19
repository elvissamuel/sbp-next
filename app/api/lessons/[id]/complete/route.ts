import { prisma } from "@/lib/db"
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

    // Calculate new progress
    const totalLessons = lesson.course.lessons.length
    if (totalLessons === 0) {
      return NextResponse.json({ error: "Course has no lessons" }, { status: 400 })
    }

    // Find the lesson index
    const lessonIndex = lesson.course.lessons.findIndex((l) => l.id === lessonId)
    if (lessonIndex === -1) {
      return NextResponse.json({ error: "Lesson not found in course" }, { status: 404 })
    }

    // Calculate progress: (completed lessons / total lessons) * 100
    // We consider a lesson complete if it's at or before the current lesson index
    // For now, we'll increment progress based on completing this lesson
    const currentProgress = enrollment.progress
    const completedLessons = Math.round((currentProgress / 100) * totalLessons)
    
    // If this lesson hasn't been completed yet, increment
    if (lessonIndex >= completedLessons) {
      const newCompletedLessons = lessonIndex + 1
      const newProgress = Math.round((newCompletedLessons / totalLessons) * 100)

      // Update enrollment progress
      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progress: Math.min(newProgress, 100),
          status: newProgress === 100 ? "completed" : enrollment.status,
          completedAt: newProgress === 100 ? new Date() : enrollment.completedAt,
        },
      })

      return NextResponse.json({
        success: true,
        enrollment: updatedEnrollment,
        progress: updatedEnrollment.progress,
        completedLessons: newCompletedLessons,
        totalLessons,
      })
    }

    // Lesson already completed
    return NextResponse.json({
      success: true,
      enrollment,
      progress: enrollment.progress,
      completedLessons: Math.round((enrollment.progress / 100) * totalLessons),
      totalLessons,
      message: "Lesson already completed",
    })
  } catch (error) {
    console.error("Error marking lesson as complete:", error)
    return NextResponse.json({ error: "Failed to mark lesson as complete" }, { status: 500 })
  }
}

