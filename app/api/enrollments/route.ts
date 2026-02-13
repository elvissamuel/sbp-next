import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get user enrollments
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            lessons: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 })
  }
}

// Create enrollment
export async function POST(request: NextRequest) {
  try {
    const { userId, courseId } = await request.json()

    if (!userId || !courseId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 })
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
      include: { course: true },
    })

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    console.error("Error creating enrollment:", error)
    return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 })
  }
}
