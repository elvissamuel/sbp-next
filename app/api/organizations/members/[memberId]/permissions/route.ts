import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const UpdatePermissionsSchema = z.object({
  permissions: z.object({
    canManageCourses: z.boolean(),
    canManageMembers: z.boolean(),
    canManageSettings: z.boolean(),
    canManageDepartments: z.boolean(),
    canManageLevels: z.boolean(),
    canViewAnalytics: z.boolean(),
    canManageGroups: z.boolean(),
  }),
  requesterUserId: z.string().optional(),
})

// Update admin permissions (only superadmin can do this)
export async function PATCH(
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
    const validationResult = UpdatePermissionsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      )
    }

    const { permissions, requesterUserId } = validationResult.data

    // Get the member being updated
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: true,
      },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Only admins can have permissions (not superadmin, member, or instructor)
    if (member.role !== "admin") {
      return NextResponse.json(
        { error: "Permissions can only be set for admin role. Superadmin has full access." },
        { status: 400 }
      )
    }

    // Check if requester is superadmin
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
          { error: "You must be a member of this organization" },
          { status: 403 }
        )
      }

      if (!isSuperAdmin(requesterMember.role)) {
        return NextResponse.json(
          { error: "Only superadmin can update admin permissions" },
          { status: 403 }
        )
      }
    }

    // Update permissions
    const updatedMember = await prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        adminPermissions: permissions,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: true,
            name: true,
          },
        },
      },
    })

    // Format response
    return NextResponse.json({
      id: updatedMember.id,
      userId: updatedMember.userId,
      email: updatedMember.user.email,
      firstName: updatedMember.user.firstName,
      lastName: updatedMember.user.lastName,
      jobTitle: updatedMember.user.jobTitle,
      department: updatedMember.user.department,
      name: updatedMember.user.firstName && updatedMember.user.lastName 
        ? `${updatedMember.user.firstName} ${updatedMember.user.lastName}` 
        : updatedMember.user.name,
      role: updatedMember.role,
      adminPermissions: updatedMember.adminPermissions as {
        canManageCourses: boolean;
        canManageMembers: boolean;
        canManageSettings: boolean;
        canManageDepartments: boolean;
        canManageLevels: boolean;
        canViewAnalytics: boolean;
        canManageGroups: boolean;
      } | null,
      joinedAt: updatedMember.joinedAt,
    })
  } catch (error) {
    console.error("Error updating admin permissions:", error)
    return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 })
  }
}

