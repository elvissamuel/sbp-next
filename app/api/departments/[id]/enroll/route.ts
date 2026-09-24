import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

type Params = { id: string }

async function getDepartmentId(params: Promise<Params> | Params) {
  const resolved = await Promise.resolve(params)
  return resolved.id
}

// Enroll everyone in a department in a course
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const departmentId = await getDepartmentId(params)
    const { courseId } = await request.json()

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    })

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, organizationId: true, title: true },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (course.organizationId !== department.organizationId) {
      return NextResponse.json({ error: "Course does not belong to this organization" }, { status: 400 })
    }

    const legacyMembers = await prisma.organizationMember.findMany({
      where: {
        organizationId: department.organizationId,
        departmentId: null,
        user: {
          department: {
            equals: department.name,
            mode: "insensitive",
          },
        },
      },
      select: { userId: true },
    })

    const userIds = [
      ...new Set([
        ...department.members.map((member) => member.userId),
        ...legacyMembers.map((member) => member.userId),
      ]),
    ]

    if (userIds.length === 0) {
      return NextResponse.json({ error: `${department.name} has no members to enroll` }, { status: 400 })
    }

    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: { in: userIds },
        courseId,
      },
      select: { userId: true },
    })

    const existingUserIds = new Set(existingEnrollments.map((enrollment) => enrollment.userId))
    const newUserIds = userIds.filter((userId) => !existingUserIds.has(userId))

    if (newUserIds.length > 0) {
      await prisma.$transaction(
        newUserIds.map((userId) =>
          prisma.enrollment.create({
            data: {
              userId,
              courseId,
            },
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      departmentName: department.name,
      enrolled: newUserIds.length,
      alreadyEnrolled: existingUserIds.size,
      totalMembers: userIds.length,
    })
  } catch (error) {
    console.error("Error enrolling department to course:", error)
    return NextResponse.json({ error: "Failed to enroll department" }, { status: 500 })
  }
}
