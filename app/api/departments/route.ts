import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get all departments for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const departments = await prisma.department.findMany({
      where: { organizationId },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Format response
    const formattedDepartments = departments.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description,
      memberCount: department.members.length,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    }))

    return NextResponse.json(formattedDepartments)
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
  }
}

// Create a new department
export async function POST(request: NextRequest) {
  try {
    const { organizationId, name, description } = await request.json()

    if (!organizationId || !name) {
      return NextResponse.json({ error: "Organization ID and name are required" }, { status: 400 })
    }

    // Check if department with same name already exists
    const existingDepartment = await prisma.department.findFirst({
      where: {
        organizationId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    })

    if (existingDepartment) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      )
    }

    const department = await prisma.department.create({
      data: {
        organizationId,
        name,
        description: description || null,
      },
    })

    // Format response
    const formattedDepartment = {
      id: department.id,
      name: department.name,
      description: department.description,
      memberCount: 0,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    }

    return NextResponse.json(formattedDepartment, { status: 201 })
  } catch (error) {
    console.error("Error creating department:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 })
  }
}

