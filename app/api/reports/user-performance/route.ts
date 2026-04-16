import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { calculateCourseProgress } from "@/lib/progress-calculator"

function getUserDisplayName(user: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim()
  return full || user.name || user.email
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    const organizationId = request.nextUrl.searchParams.get("organizationId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            jobTitle: true,
            department: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!member?.user) {
      return NextResponse.json({ error: "User is not a member of this organization" }, { status: 404 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        course: {
          organizationId,
        },
      },
      include: {
        course: {
          include: {
            lessons: {
              select: { id: true },
            },
            quizzes: {
              include: {
                attempts: {
                  where: { userId },
                  orderBy: { attemptedAt: "desc" },
                  select: {
                    id: true,
                    score: true,
                    passed: true,
                    attemptedAt: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const courseReports = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progressData = await calculateCourseProgress(userId, enrollment.courseId)

        const quizzes = enrollment.course.quizzes.map((quiz) => {
          const attempts = quiz.attempts || []
          const latest = attempts[0] || null
          const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null
          const attemptsCount = attempts.length

          const totalPoints = quiz.totalPoints
          const latestPercentage = latest ? Math.round((latest.score / totalPoints) * 100) : null
          const bestPercentage = bestScore !== null ? Math.round((bestScore / totalPoints) * 100) : null

          return {
            id: quiz.id,
            title: quiz.title,
            passingScore: quiz.passingScore,
            totalPoints: quiz.totalPoints,
            status: quiz.status,
            attemptsCount,
            latestAttempt: latest
              ? {
                  id: latest.id,
                  score: latest.score,
                  percentage: latestPercentage,
                  passed: latest.passed,
                  attemptedAt: latest.attemptedAt,
                }
              : null,
            best: bestScore !== null ? { score: bestScore, percentage: bestPercentage } : null,
            passed: !!latest?.passed,
          }
        })

        const quizzesTotal = quizzes.length
        const quizzesAttempted = quizzes.filter((q) => q.latestAttempt).length
        const quizzesPassed = quizzes.filter((q) => q.passed).length

        const attemptedPercentages = quizzes
          .map((q) => q.latestAttempt?.percentage)
          .filter((p): p is number => typeof p === "number")

        const avgQuizScorePercent =
          attemptedPercentages.length > 0
            ? Math.round(attemptedPercentages.reduce((sum, p) => sum + p, 0) / attemptedPercentages.length)
            : 0

        return {
          enrollment: {
            id: enrollment.id,
            status: enrollment.status,
            progress: enrollment.progress,
            createdAt: enrollment.createdAt,
            updatedAt: enrollment.updatedAt,
            completedAt: enrollment.completedAt,
          },
          course: {
            id: enrollment.course.id,
            title: enrollment.course.title,
            status: enrollment.course.status,
            createdAt: enrollment.course.createdAt,
            updatedAt: enrollment.course.updatedAt,
            totalLessons: enrollment.course.lessons.length,
          },
          progress: {
            progress: progressData.progress,
            completedLessons: progressData.completedLessons,
            totalLessons: progressData.totalLessons,
            quizProgress: progressData.quizProgress,
          },
          quizzes,
          quizSummary: {
            quizzesTotal,
            quizzesAttempted,
            quizzesPassed,
            avgQuizScorePercent,
          },
        }
      })
    )

    const coursesEnrolled = courseReports.length
    const coursesCompleted = courseReports.filter((c) => c.progress.progress >= 100 || c.enrollment.status === "completed").length

    const avgCourseProgress =
      coursesEnrolled > 0
        ? Math.round(courseReports.reduce((sum, c) => sum + (c.progress.progress || 0), 0) / coursesEnrolled)
        : 0

    const allQuizzes = courseReports.flatMap((c) => c.quizzes)
    const totalQuizzes = allQuizzes.length
    const quizzesPassed = allQuizzes.filter((q) => q.passed).length

    const allAttemptedQuizPercentages = allQuizzes
      .map((q) => q.latestAttempt?.percentage)
      .filter((p): p is number => typeof p === "number")

    const avgQuizScorePercent =
      allAttemptedQuizPercentages.length > 0
        ? Math.round(allAttemptedQuizPercentages.reduce((sum, p) => sum + p, 0) / allAttemptedQuizPercentages.length)
        : 0

    return NextResponse.json({
      user: {
        id: member.user.id,
        email: member.user.email,
        name: getUserDisplayName(member.user),
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        jobTitle: member.user.jobTitle,
        department: member.user.department,
      },
      organization: member.organization,
      summary: {
        coursesEnrolled,
        coursesCompleted,
        avgCourseProgress,
        totalQuizzes,
        quizzesPassed,
        avgQuizScorePercent,
      },
      courses: courseReports,
    })
  } catch (error) {
    console.error("Error generating user performance report:", error)
    return NextResponse.json({ error: "Failed to generate user performance report" }, { status: 500 })
  }
}
