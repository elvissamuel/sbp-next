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

    // Try to find by slug first, then by id
    let course = await prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
        quizzes: {
          orderBy: { createdAt: "asc" },
          include: {
            attempts: userId
              ? {
                  where: { userId },
                  orderBy: { attemptedAt: "desc" },
                  take: 1,
                }
              : false,
          },
        },
      },
    })

    // If not found by slug, try by id
    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: slug },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
          quizzes: {
            orderBy: { createdAt: "asc" },
            include: {
              attempts: userId
                ? {
                    where: { userId },
                    orderBy: { attemptedAt: "desc" },
                    take: 1,
                  }
                : false,
            },
          },
        },
      })
    }

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
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

    // Calculate progress
    const progress = enrollment?.progress || 0
    const totalLessons = course.lessons.length
    const completedLessons = totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0

    return NextResponse.json({
      ...course,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            status: enrollment.status,
            progress: enrollment.progress,
            completedAt: enrollment.completedAt,
          }
        : null,
      stats: {
        totalLessons,
        completedLessons,
        progress,
      },
    })
  } catch (error) {
    console.error("Error fetching course by slug:", error)
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 })
  }
}
