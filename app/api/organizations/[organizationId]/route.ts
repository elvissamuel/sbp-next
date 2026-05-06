import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"

type Params = { organizationId: string }

const SYSTEM_ORG_SLUG = "system-default-courses"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const organizationId = resolvedParams.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const { requesterUserId } = await request.json()

    if (!requesterUserId) {
      return NextResponse.json({ error: "Requester user ID is required" }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, slug: true },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (organization.slug === SYSTEM_ORG_SLUG) {
      return NextResponse.json(
        { error: "This organization cannot be deleted" },
        { status: 403 }
      )
    }

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
        { error: "You must be a member of this organization to delete it" },
        { status: 403 }
      )
    }

    const isAdmin = requesterMember.role === "admin" || isSuperAdmin(requesterMember.role)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only organization admins can delete this organization" },
        { status: 403 }
      )
    }

    await prisma.organization.delete({
      where: { id: organizationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 })
  }
}
