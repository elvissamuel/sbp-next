import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Update a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const departmentId = resolvedParams.id

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    const { name, description } = await request.json()

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    if (name !== undefined) {
      const duplicateDepartment = await prisma.department.findFirst({
        where: {
          id: { not: departmentId },
          organizationId: existingDepartment.organizationId,
          name: {
            equals: String(name).trim(),
            mode: "insensitive",
          },
        },
      })

      if (duplicateDepartment) {
        return NextResponse.json(
          { error: "A department with this name already exists" },
          { status: 409 }
        )
      }
    }

    const department = await prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: department.id,
      name: department.name,
      description: department.description,
      memberCount: department.members.length,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    })
  } catch (error) {
    console.error("Error updating department:", error)
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 })
  }
}

// Delete a department
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const departmentId = resolvedParams.id

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    })

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    await prisma.department.delete({
      where: { id: departmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting department:", error)
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 })
  }
}
