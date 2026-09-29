import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get a course by slug (for student/classroom view)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const slug = resolvedParams.slug

    if (!slug) {
      return NextResponse.json({ error: "Course slug is required" }, { status: 400 })
    }

    // Get the current user from query params if available (for enrollment/progress)
    const userId = request.nextUrl.searchParams.get("userId") || null

    // Slug is unique per organization, so prefer the course this learner is enrolled in.
    const courseInclude = {
      modules: {
        orderBy: { order: "asc" as const },
        include: { lessons: { orderBy: { order: "asc" as const } } },
      },
      lessons: {
        orderBy: { order: "asc" as const },
      },
      quizzes: {
        orderBy: { createdAt: "asc" as const },
        include: {
          attempts: userId
            ? {
                where: { userId },
                orderBy: { attemptedAt: "desc" as const },
              }
            : false as const,
        },
      },
    }

    let course = userId
      ? await prisma.course.findFirst({
          where: {
            OR: [{ slug }, { id: slug }],
            enrollments: { some: { userId } },
          },
          include: courseInclude,
        })
      : null

    if (!course) {
      course = await prisma.course.findFirst({
        where: { slug },
        include: courseInclude,
      })
    }

    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: slug },
        include: courseInclude,
      })
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Enforce deadline for learners
    // If a deadline is set and has passed, prevent taking the course via classroom endpoints.
    // We only enforce when userId is present (classroom/learner context).
    const courseDeadline = (course as any).deadline as Date | null | undefined
    if (userId && courseDeadline && new Date(courseDeadline).getTime() < Date.now()) {
      return NextResponse.json(
        {
          error: "Course deadline has passed. You can no longer take this course.",
          expired: true,
          deadline: courseDeadline,
        },
        { status: 403 }
      )
    }

    // Get user enrollment if userId is provided
    let enrollment = null
    if (userId) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: course.id,
          },
        },
      })
    }

    // Learner view only includes published lessons and quizzes, for every role.
    const visibleLesson = (lesson: { status: string | null }) => lesson.status === "published"
    const filteredLessons = course.lessons.filter((lesson) => visibleLesson(lesson))
    const filteredModules = course.modules
      .map((module) => ({
        ...module,
        lessons: module.lessons.filter((lesson) => visibleLesson(lesson)),
      }))
      .filter((module) => module.lessons.length > 0)
    const filteredQuizzes = course.quizzes.filter((quiz) => quiz.status === "published")

    let completedLessonIds: string[] = []
    if (enrollment) {
      const completions = await prisma.lessonCompletion.findMany({
        where: { enrollmentId: enrollment.id },
        select: { lessonId: true },
      })
      completedLessonIds = completions.map((completion) => completion.lessonId)
    }

    // Calculate progress (includes quiz performance if enrollment exists)
    let progress = 0
    let completedLessons = 0
    let quizProgress = 0
    let certificateEligible = false
    
    if (enrollment && userId) {
      // Use the progress calculator to get accurate progress including quizzes
      // But only count published lessons/quizzes
      const { calculateCourseProgress } = await import("@/lib/progress-calculator")
      const progressData = await calculateCourseProgress(userId, course.id)
      progress = progressData.progress
      completedLessons = progressData.completedLessons
      quizProgress = progressData.quizProgress
      certificateEligible = progressData.certificateEligible
      if (progressData.certificateEligible && enrollment && (enrollment.status !== "completed" || !enrollment.completedAt)) {
        enrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "completed",
            completedAt: enrollment.completedAt ?? progressData.earnedAt ?? new Date(),
          },
        })
      }
    } else {
      // No enrollment, use default values
      const totalLessons = filteredLessons.length
      completedLessons = 0
    }

    const totalLessons = filteredLessons.length

    return NextResponse.json({
      ...course,
      lessons: filteredLessons,
      modules: filteredModules,
      quizzes: filteredQuizzes,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            status: enrollment.status,
            progress: progress,
            completedAt: enrollment.completedAt,
          }
        : null,
      stats: {
        totalLessons,
        completedLessons,
        completedLessonIds,
        progress,
        quizProgress,
        certificateEligible,
      },
    })
  } catch (error) {
    console.error("Error fetching course by slug:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}
