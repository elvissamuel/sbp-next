import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get a single group
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> | { groupId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const groupId = resolvedParams.groupId

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.length,
      memberIds: group.members.map((member) => member.userId),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    })
  } catch (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 })
  }
}

// Update a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> | { groupId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const groupId = resolvedParams.groupId

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
    }

    const { name, description, memberIds } = await request.json()

    if (name !== undefined && typeof name === "string" && !name.trim()) {
      return NextResponse.json({ error: "Group name cannot be empty" }, { status: 400 })
    }

    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    })

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const group = await prisma.$transaction(async (tx) => {
      const updatedGroup = await tx.group.update({
        where: { id: groupId },
        data: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
        },
      })

      if (Array.isArray(memberIds)) {
        await tx.groupMember.deleteMany({
          where: { groupId },
        })

        if (memberIds.length > 0) {
          await tx.groupMember.createMany({
            data: memberIds.map((userId: string) => ({
              groupId,
              userId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return tx.group.findUnique({
        where: { id: updatedGroup.id },
        include: { members: true },
      })
    })

    if (!group) {
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      members: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    })
  } catch (error) {
    console.error("Error updating group:", error)
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
  }
}

// Delete a group
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> | { groupId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const groupId = resolvedParams.groupId

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
    }

    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    })

    if (!existingGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    await prisma.group.delete({
      where: { id: groupId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting group:", error)
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }
}
