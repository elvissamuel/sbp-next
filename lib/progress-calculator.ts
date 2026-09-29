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
): Promise<{ progress: number; completedLessons: number; totalLessons: number; quizProgress: number; certificateEligible: boolean; earnedAt: Date | null }> {
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
    completedLessons = await prisma.lessonCompletion.count({
      where: {
        enrollmentId: enrollment.id,
        lesson: { courseId },
      },
    })
    lessonProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
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

  const publishedLessons = course.lessons.filter((lesson) => lesson.status === "published")
  const publishedQuizzes = course.quizzes.filter((quiz) => quiz.status === "published")
  let certificateEligible = false
  let earnedAt: Date | null = null

  if (enrollment && publishedLessons.length + publishedQuizzes.length > 0) {
    const completions = await prisma.lessonCompletion.findMany({
      where: {
        enrollmentId: enrollment.id,
        lessonId: { in: publishedLessons.map((lesson) => lesson.id) },
      },
      select: { lessonId: true, completedAt: true },
    })
    const completedIds = new Set(completions.map((completion) => completion.lessonId))
    const lessonsDone = publishedLessons.every((lesson) => completedIds.has(lesson.id))
    const quizzesPassed = publishedQuizzes.every((quiz) => quiz.attempts.some((attempt) => attempt.passed))
    certificateEligible = lessonsDone && quizzesPassed

    if (certificateEligible) {
      for (const completion of completions) {
        if (!earnedAt || completion.completedAt > earnedAt) earnedAt = completion.completedAt
      }
      for (const quiz of publishedQuizzes) {
        for (const attempt of quiz.attempts) {
          if (!attempt.passed) continue
          if (!earnedAt || attempt.attemptedAt > earnedAt) earnedAt = attempt.attemptedAt
        }
      }
    }
  }

  return {
    progress: overallProgress,
    completedLessons,
    totalLessons,
    quizProgress: Math.round(quizProgress),
    certificateEligible,
    earnedAt,
  }
}

/**
 * Recalculate and update enrollment progress
 */
export async function updateEnrollmentProgress(
  userId: string,
  courseId: string
): Promise<{ progress: number; completedLessons: number; totalLessons: number; quizProgress: number; certificateEligible: boolean; earnedAt: Date | null }> {
  const progressData = await calculateCourseProgress(userId, courseId)
  const shouldComplete = progressData.progress === 100 || progressData.certificateEligible
  const existing = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { completedAt: true },
  })
  const completedAt = existing?.completedAt ?? progressData.earnedAt ?? new Date()

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    create: {
      userId,
      courseId,
      status: shouldComplete ? "completed" : "active",
      progress: progressData.progress,
      completedAt: shouldComplete ? completedAt : null,
    },
    update: {
      progress: progressData.progress,
      ...(shouldComplete ? { status: "completed", completedAt } : {}),
    },
  })

  return progressData
}

