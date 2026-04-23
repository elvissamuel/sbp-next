import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const UpdateMemberSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().min(1).optional(),
  jobTitle: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  role: z.enum(["superadmin", "admin", "member", "instructor"]).optional(),
  requesterUserId: z.string().optional(),
})

// Update a member in an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> | { memberId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const memberId = resolvedParams.memberId

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const validationResult = UpdateMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      )
    }

    const { firstName, lastName, jobTitle, department, role, requesterUserId } = validationResult.data

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
        organization: {
          select: { id: true },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (requesterUserId) {
      const requesterMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: member.organizationId,
            userId: requesterUserId,
          },
        },
      })

      if (!requesterMember) {
        return NextResponse.json(
          { error: "You must be a member of this organization to update members" },
          { status: 403 }
        )
      }

      if (!isSuperAdmin(requesterMember.role) && requesterMember.role !== "admin") {
        return NextResponse.json(
          { error: "Only superadmin and admin can update members" },
          { status: 403 }
        )
      }

      if (member.role === "superadmin" && !isSuperAdmin(requesterMember.role)) {
        return NextResponse.json(
          { error: "Only superadmin can update a superadmin" },
          { status: 403 }
        )
      }

      if (role === "superadmin" && !isSuperAdmin(requesterMember.role)) {
        return NextResponse.json(
          { error: "Only superadmin can assign superadmin role" },
          { status: 403 }
        )
      }
    }

    const updatedMember = await prisma.$transaction(async (tx) => {
      const orgMember = await tx.organizationMember.update({
        where: { id: memberId },
        data: {
          ...(role !== undefined ? { role } : {}),
        },
      })

      const user = await tx.user.update({
        where: { id: member.userId },
        data: {
          ...(firstName !== undefined ? { firstName } : {}),
          ...(lastName !== undefined ? { lastName } : {}),
          ...(jobTitle !== undefined ? { jobTitle: jobTitle || null } : {}),
          ...(department !== undefined ? { department: department || null } : {}),
        },
      })

      return { orgMember, user }
    })

    return NextResponse.json({
      id: updatedMember.orgMember.id,
      userId: updatedMember.orgMember.userId,
      email: updatedMember.user.email,
      firstName: updatedMember.user.firstName,
      lastName: updatedMember.user.lastName,
      jobTitle: updatedMember.user.jobTitle,
      department: updatedMember.user.department,
      name:
        updatedMember.user.firstName && updatedMember.user.lastName
          ? `${updatedMember.user.firstName} ${updatedMember.user.lastName}`
          : updatedMember.user.name,
      role: updatedMember.orgMember.role,
      adminPermissions: updatedMember.orgMember.adminPermissions as {
        canManageCourses: boolean
        canManageMembers: boolean
        canManageSettings: boolean
        canManageDepartments: boolean
        canManageLevels: boolean
        canViewAnalytics: boolean
        canManageGroups: boolean
      } | null,
      joinedAt: updatedMember.orgMember.joinedAt,
    })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

// Delete a member from an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> | { memberId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const memberId = resolvedParams.memberId

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 })
    }

    // Get the member being deleted
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Prevent deleting superadmin (they can't be removed)
    if (member.role === "superadmin") {
      return NextResponse.json(
        { error: "Cannot remove superadmin from organization" },
        { status: 403 }
      )
    }

    // Get requester info from query params (optional, for permission checks)
    const requesterUserId = request.nextUrl.searchParams.get("requesterUserId")

    // Check if requester is superadmin (optional check)
    if (requesterUserId) {
      const requesterMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: member.organizationId,
            userId: requesterUserId,
          },
        },
      })

      if (!requesterMember) {
        return NextResponse.json(
          { error: "You must be a member of this organization to remove members" },
          { status: 403 }
        )
      }

      // Only superadmin and admin can remove members
      if (!isSuperAdmin(requesterMember.role) && requesterMember.role !== "admin") {
        return NextResponse.json(
          { error: "Only superadmin and admin can remove members" },
          { status: 403 }
        )
      }
    }

    // Remove course enrollments in this organization, then delete membership and user.
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.deleteMany({
        where: {
          userId: member.userId,
          course: {
            organizationId: member.organizationId,
          },
        },
      })

      await tx.organizationMember.delete({
        where: { id: memberId },
      })

      await tx.user.delete({
        where: { id: member.userId },
      })
    })

    return NextResponse.json(
      {
        success: true,
        message: "Member removed and user account deleted successfully",
        member: {
          id: member.id,
          email: member.user.email,
          name: member.user.firstName && member.user.lastName
            ? `${member.user.firstName} ${member.user.lastName}`
            : member.user.email,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}


