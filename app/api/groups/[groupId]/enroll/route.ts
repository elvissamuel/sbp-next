import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Enroll all members of a group to a course
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Get the group with all its members
    const group = await prisma.group.findUnique({
      where: { id: params.groupId },
      include: {
        members: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.members.length === 0) {
      return NextResponse.json({ error: "Group has no members" }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get all user IDs from the group members
    const userIds = group.members.map((member) => member.userId)

    // Check for existing enrollments
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: { in: userIds },
        courseId,
      },
    })

    const existingUserIds = new Set(existingEnrollments.map((e) => e.userId))
    const newUserIds = userIds.filter((userId) => !existingUserIds.has(userId))

    if (newUserIds.length === 0) {
      return NextResponse.json({ 
        error: "All group members are already enrolled in this course",
        alreadyEnrolled: existingUserIds.size,
      }, { status: 400 })
    }

    // Create enrollments for all members who aren't already enrolled
    const enrollments = await prisma.$transaction(
      newUserIds.map((userId) =>
        prisma.enrollment.create({
          data: {
            userId,
            courseId,
          },
          include: { course: true },
        })
      )
    )

    return NextResponse.json({
      success: true,
      enrolled: enrollments.length,
      alreadyEnrolled: existingUserIds.size,
      totalMembers: userIds.length,
      enrollments,
    }, { status: 201 })
  } catch (error) {
    console.error("Error enrolling group to course:", error)
    return NextResponse.json({ error: "Failed to enroll group to course" }, { status: 500 })
  }
}

