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

    const { organizationId, title, description, status, thumbnail, deadline } = validationResult.data

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Enforce Free tier course limit: max 2 courses
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: "active",
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (activeSubscription?.plan === "free") {
      const courseCount = await prisma.course.count({
        where: { organizationId },
      })
      if (courseCount >= 2) {
        return NextResponse.json(
          { error: "Free plan limit reached: you can only create up to 2 courses." },
          { status: 403 }
        )
      }
    }

    // Check if a course with the same title already exists in this organization
    const existingCourse = await prisma.course.findFirst({
      where: {
        organizationId,
        title: title.trim(),
      },
    })

    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this title already exists in your organization" },
        { status: 400 }
      )
    }

    // Generate slug and ensure it's unique within the organization
    let baseSlug = generateSlug(title)
    let slug = baseSlug
    let slugCounter = 1

    // Check if slug already exists in this organization and append number if needed
    while (true) {
      const existingSlug = await prisma.course.findUnique({
        where: {
          organizationId_slug: {
            organizationId,
            slug,
          },
        },
      })

      if (!existingSlug) {
        break
      }

      slug = `${baseSlug}-${slugCounter}`
      slugCounter++
    }

    const course = await prisma.course.create({
      data: {
        organizationId,
        title: title.trim(),
        description,
        slug,
        status: status || "draft",
        thumbnail: thumbnail && thumbnail !== "" ? thumbnail : null,
        deadline: deadline || null,
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
