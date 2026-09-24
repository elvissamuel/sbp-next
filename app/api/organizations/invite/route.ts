import { prisma } from "@/lib/db"
import { InviteMemberSchema } from "@/lib/validation-schema"
import { sendInviteEmail } from "@/lib/email"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"

// Invite a member to an organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body with zod schema
    const validationResult = InviteMemberSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { organizationId, email, role, requesterUserId } = validationResult.data

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Enforce Free tier member limit: max 3 total members (owner + 2 invited)
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
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId },
      })
      if (memberCount >= 3) {
        return NextResponse.json(
          { error: "Free plan limit reached: you can only have up to 3 organization members (you + 2 invited)." },
          { status: 403 }
        )
      }
    }

    // Check if requester is a superadmin (only superadmin can assign admin role)
    if (role === "admin" && requesterUserId) {
      const requesterMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: requesterUserId,
          },
        },
      })

      if (!requesterMember) {
        return NextResponse.json(
          { error: "You must be a member of this organization to invite others" },
          { status: 403 }
        )
      }

      if (!isSuperAdmin(requesterMember.role)) {
        return NextResponse.json(
          { error: "Only superadmin can assign admin role to members" },
          { status: 403 }
        )
      }
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Send invitation email with signup link
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const signupLink = `${baseUrl}/auth/signup?email=${encodeURIComponent(email)}&invite=true&orgId=${organizationId}&role=${role}`

    // Existing users can belong to more than one organization.
    if (user) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      })

      if (existingMember && existingMember.status !== "pending") {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        )
      }

      const invitedRole = role.toLowerCase()
      const adminPermissions = invitedRole === "admin"
        ? {
            canManageCourses: false,
            canManageMembers: false,
            canManageSettings: false,
            canManageDepartments: false,
            canManageLevels: false,
            canViewAnalytics: false,
            canManageGroups: false,
          }
        : undefined

      if (existingMember) {
        await prisma.organizationMember.update({
          where: { id: existingMember.id },
          data: {
            role: invitedRole,
            adminPermissions: adminPermissions ?? Prisma.DbNull,
          },
        })
      } else {
        await prisma.organizationMember.create({
          data: {
            organizationId,
            userId: user.id,
            role: invitedRole,
            status: "pending",
            ...(adminPermissions ? { adminPermissions } : {}),
          },
        })
      }

      const acceptLink = `${baseUrl}/auth/accept-invite?email=${encodeURIComponent(email)}&orgId=${organizationId}&role=${invitedRole}`

      await sendInviteEmail({
        email,
        organizationName: organization.name,
        inviteLink: acceptLink,
        existingAccount: true,
      })

      return NextResponse.json(
        {
          message: "Invitation email sent successfully",
          email,
          organizationName: organization.name,
        },
        { status: 201 }
      )
    }

    // User doesn't exist - send invitation email with signup link
    await sendInviteEmail({
      email,
      organizationName: organization.name,
      inviteLink: signupLink,
    })

    return NextResponse.json(
      {
        message: "Invitation email sent successfully",
        email,
        organizationName: organization.name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error inviting member:", error)
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 })
  }
}

