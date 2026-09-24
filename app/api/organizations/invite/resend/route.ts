import { prisma } from "@/lib/db"
import { sendInviteEmail } from "@/lib/email"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"

const INVITE_ROLES = ["admin", "member", "instructor"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : ""
    const memberId = typeof body.memberId === "string" ? body.memberId : ""
    const requesterUserId = typeof body.requesterUserId === "string" ? body.requesterUserId : ""

    if (!organizationId || !memberId) {
      return NextResponse.json({ error: "Organization and member are required" }, { status: 400 })
    }

    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
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

    if (!member || member.organizationId !== organizationId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (requesterUserId) {
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
          { error: "You must be a member of this organization to resend invitations" },
          { status: 403 }
        )
      }

      if (!isSuperAdmin(requesterMember.role) && requesterMember.role !== "admin") {
        return NextResponse.json(
          { error: "Only superadmin and admin can resend invitations" },
          { status: 403 }
        )
      }
    }

    const role = INVITE_ROLES.includes(member.role as (typeof INVITE_ROLES)[number])
      ? member.role
      : "member"
    const email = member.user.email
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const acceptLink = `${baseUrl}/auth/accept-invite?email=${encodeURIComponent(email)}&orgId=${organizationId}&role=${role}`

    await sendInviteEmail({
      email,
      organizationName: member.organization.name,
      inviteLink: acceptLink,
      existingAccount: true,
    })

    return NextResponse.json({
      message: "Invitation email sent successfully",
      email,
    })
  } catch (error) {
    console.error("Error resending invitation:", error)
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 })
  }
}
