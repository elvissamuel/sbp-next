import { prisma } from "@/lib/db"
import { InviteMemberSchema } from "@/lib/validation-schema"
import { sendInviteEmail } from "@/lib/email"
import { type NextRequest, NextResponse } from "next/server"
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

    const { organizationId, email, role } = validationResult.data

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    // Send invitation email with signup link
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const signupLink = `${baseUrl}/auth/signup?email=${encodeURIComponent(email)}&invite=true&orgId=${organizationId}&role=${role}`

    // If user exists, add them immediately
    if (user) {
      // Check if user is already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        )
      }

      // Add user to organization
      const member = await prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          role: role.toLowerCase(), // Ensure lowercase to match schema (admin, member, instructor)
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
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

      // Send notification email to existing user
      await sendInviteEmail({
        email,
        organizationName: organization.name,
        inviteLink: `${baseUrl}/org/courses`, // Link to courses page for existing users
      })

      return NextResponse.json(
        {
          message: "Member added successfully",
          member: {
            id: member.id,
            email: member.user.email,
            name: member.user.name,
            role: member.role,
            organizationId: member.organizationId,
            organizationName: member.organization.name,
          },
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

