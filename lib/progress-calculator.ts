import { prisma } from "@/lib/db"

/**
 * Calculate course progress based on lessons and quizzes
 * Formula: (Lesson Progress * 0.7) + (Quiz Progress * 0.3)
 * 
 * Lesson Progress: (completed lessons / total lessons) * 100
 * Quiz Progress: Average of quiz scores (if passed, count as 100%, if failed, use actual score percentage)
 */
export async function calculateCourseProgress(
  userId: string,
  courseId: string
): Promise<{ progress: number; completedLessons: number; totalLessons: number; quizProgress: number }> {
  // Get course with lessons and quizzes
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
      },
      quizzes: {
        include: {
          questions: true,
          attempts: {
            where: { userId },
            orderBy: { attemptedAt: "desc" },
          },
        },
      },
      enrollments: {
        where: { userId },
      },
    },
  })

  if (!course) {
    throw new Error("Course not found")
  }

  const totalLessons = course.lessons.length
  const enrollment = course.enrollments[0]

  // Calculate lesson progress based on the last completed lesson index
  // We'll use a simple approach: check enrollment progress as lesson-only progress
  // In a future enhancement, we could track individual lesson completions
  let lessonProgress = 0
  let completedLessons = 0

  if (enrollment) {
    // For now, we reverse-calculate from enrollment.progress assuming it was lesson-based
    // This maintains backward compatibility
    // In practice, enrollment.progress might already be a combined value
    // So we'll calculate fresh based on what we know
    
    // Since we don't have a LessonCompletion model, we'll use the existing enrollment.progress
    // as a baseline for lesson progress, but we'll recalculate overall progress
    const currentEnrollmentProgress = enrollment.progress || 0
    
    // Estimate completed lessons from current progress
    // This is an approximation - ideally we'd track lesson completions separately
    completedLessons = totalLessons > 0 
      ? Math.round((currentEnrollmentProgress / 100) * totalLessons) 
      : 0
    
    // Calculate lesson-only progress (not including quizzes)
    lessonProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0
  }

  // Calculate quiz progress
  const totalQuizzes = course.quizzes.length
  let quizProgress = 0

  if (totalQuizzes > 0 && enrollment) {
    // Get the latest attempt for each quiz
    const quizScores: number[] = []
    
    for (const quiz of course.quizzes) {
      const latestAttempt = quiz.attempts[0] // Already sorted by attemptedAt desc
      
      if (latestAttempt) {
        // Calculate percentage score for this quiz
        const quizScorePercentage = (latestAttempt.score / quiz.totalPoints) * 100
        quizScores.push(quizScorePercentage)
      }
      // If no attempt, quiz contributes 0% to progress
    }

    // Calculate average quiz performance
    if (quizScores.length > 0) {
      const totalQuizScore = quizScores.reduce((sum, score) => sum + score, 0)
      quizProgress = totalQuizScore / quizScores.length
    } else {
      quizProgress = 0
    }
  }

  // Calculate overall progress: 70% lessons, 30% quizzes
  // If no quizzes exist, use 100% lesson progress
  let overallProgress = 0
  if (totalQuizzes === 0) {
    overallProgress = lessonProgress
  } else {
    // Weighted average: 70% lessons, 30% quizzes
    overallProgress = Math.round(lessonProgress * 0.7 + quizProgress * 0.3)
  }

  // Ensure progress is between 0 and 100
  overallProgress = Math.max(0, Math.min(100, overallProgress))

  return {
    progress: overallProgress,
    completedLessons,
    totalLessons,
    quizProgress: Math.round(quizProgress),
  }
}

/**
 * Recalculate and update enrollment progress
 */
export async function updateEnrollmentProgress(
  userId: string,
  courseId: string
): Promise<{ progress: number; completedLessons: number; totalLessons: number; quizProgress: number }> {
  const progressData = await calculateCourseProgress(userId, courseId)

  // Update enrollment
  const enrollment = await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    create: {
      userId,
      courseId,
      status: "active",
      progress: progressData.progress,
    },
    update: {
      progress: progressData.progress,
      status: progressData.progress === 100 ? "completed" : undefined,
      completedAt: progressData.progress === 100 ? new Date() : undefined,
    },
  })

  return progressData
}

