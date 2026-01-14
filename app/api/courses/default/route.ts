import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get default courses from system organization
export async function GET(request: NextRequest) {
  try {
    // Find the system organization
    const systemOrg = await prisma.organization.findUnique({
      where: { slug: "system-default-courses" },
    })

    if (!systemOrg) {
      return NextResponse.json([])
    }

    // Get all published courses from system organization
    const courses = await prisma.course.findMany({
      where: {
        organizationId: systemOrg.id,
        status: "published",
      },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching default courses:", error)
    return NextResponse.json({ error: "Failed to fetch default courses" }, { status: 500 })
  }
}

