import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get all groups for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const groups = await prisma.group.findMany({
      where: { organizationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Format response
    const formattedGroups = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }))

    return NextResponse.json(formattedGroups)
  } catch (error) {
    console.error("Error fetching groups:", error)
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }
}

// Create a new group
export async function POST(request: NextRequest) {
  try {
    const { organizationId, name, description, memberIds } = await request.json()

    if (!organizationId || !name) {
      return NextResponse.json({ error: "Organization ID and name are required" }, { status: 400 })
    }

    // Create group with members
    const group = await prisma.group.create({
      data: {
        organizationId,
        name,
        description: description || null,
        members: {
          create: memberIds?.map((userId: string) => ({
            userId,
          })) || [],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Format response
    const formattedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }

    return NextResponse.json(formattedGroup, { status: 201 })
  } catch (error) {
    console.error("Error creating group:", error)
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
  }
}

