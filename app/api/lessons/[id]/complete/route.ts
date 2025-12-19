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

    // Find the lesson index
    const lessonIndex = lesson.course.lessons.findIndex((l) => l.id === lessonId)
    if (lessonIndex === -1) {
      return NextResponse.json({ error: "Lesson not found in course" }, { status: 404 })
    }

    // Check if this lesson should update progress
    // Calculate current completed lessons based on lesson index progression
    // When lesson at index N is completed, all lessons 0..N are considered completed
    const currentCompletedLessons = Math.round((enrollment.progress / 100) * totalLessons)
    
    // If this lesson hasn't been completed yet, update progress
    if (lessonIndex >= currentCompletedLessons) {
      // First, update lesson-only progress to track lesson completion
      // This ensures we can calculate lesson progress separately from quiz progress
      const newCompletedLessons = lessonIndex + 1
      const lessonOnlyProgress = Math.round((newCompletedLessons / totalLessons) * 100)
      
      // Temporarily set enrollment.progress to lesson-only progress
      // Then updateEnrollmentProgress will combine with quiz scores
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progress: lessonOnlyProgress, // Set to lesson-only first
        },
      })
      
      // Now update progress using the progress calculator (includes quiz performance)
      // This will recalculate and store the combined progress
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
    }

    // Lesson already completed, just return current progress
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
      message: "Lesson already completed",
    })
  } catch (error) {
    console.error("Error marking lesson as complete:", error)
    return NextResponse.json({ error: "Failed to mark lesson as complete" }, { status: 500 })
  }
}

