import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { type NextRequest, NextResponse } from "next/server"

type Params = { organizationId: string }

// Get organization preferences/settings
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const organizationId = resolvedParams.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logo: true,
        description: true,
        themePrimaryColor: true,
        themeSecondaryColor: true,
        themeAccentColor: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Error fetching organization settings:", error)
    return NextResponse.json({ error: "Failed to fetch organization settings" }, { status: 500 })
  }
}

// Update organization preferences/settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const organizationId = resolvedParams.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const {
      requesterUserId,
      name,
      logo,
      description,
      themePrimaryColor,
      themeSecondaryColor,
      themeAccentColor,
    } = await request.json()

    if (!requesterUserId) {
      return NextResponse.json({ error: "Requester user ID is required" }, { status: 400 })
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
        { error: "You must be a member of this organization to update settings" },
        { status: 403 }
      )
    }

    const isAdmin = requesterMember.role === "admin" || isSuperAdmin(requesterMember.role)
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only organization admins can update settings" },
        { status: 403 }
      )
    }

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(logo !== undefined ? { logo: logo || null } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(themePrimaryColor !== undefined ? { themePrimaryColor: themePrimaryColor || "#01402E" } : {}),
        ...(themeSecondaryColor !== undefined ? { themeSecondaryColor: themeSecondaryColor || "#65B32E" } : {}),
        ...(themeAccentColor !== undefined ? { themeAccentColor: themeAccentColor || "#DE1915" } : {}),
      },
      select: {
        id: true,
        name: true,
        logo: true,
        description: true,
        themePrimaryColor: true,
        themeSecondaryColor: true,
        themeAccentColor: true,
      },
    })

    return NextResponse.json(updatedOrganization)
  } catch (error) {
    console.error("Error updating organization settings:", error)
    return NextResponse.json({ error: "Failed to update organization settings" }, { status: 500 })
  }
}
