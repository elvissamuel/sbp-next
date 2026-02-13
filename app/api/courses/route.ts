import { prisma } from "@/lib/db"
import { generateSlug } from "@/lib/utils"
import { CreateCourseSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

// Get all courses for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")
    const published = request.nextUrl.searchParams.get("published") === "true"

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const courses = await prisma.course.findMany({
      where: {
        organizationId,
        ...(published && { status: "published" }),
      },
      include: {
        lessons: true,
        enrollments: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error("Error fetching courses:", error)
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}

// Create a new course
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body with zod schema
    const validationResult = CreateCourseSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { organizationId, title, description, status, thumbnail } = validationResult.data

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const slug = generateSlug(title)

    const course = await prisma.course.create({
      data: {
        organizationId,
        title,
        description,
        slug,
        status: status || "draft",
        thumbnail: thumbnail && thumbnail !== "" ? thumbnail : null,
        // Default values for optional fields
        level: "beginner",
        price: 0,
        currency: "NGN",
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error("Error creating course:", error)
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
