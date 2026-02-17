import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get all levels for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const levels = await prisma.level.findMany({
      where: { organizationId },
      include: {
        members: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { levelNumber: "asc" }, // Order by level number (ascending: Level 1 first)
    })

    // Format response
    const formattedLevels = levels.map((level) => ({
      id: level.id,
      name: level.name,
      levelNumber: level.levelNumber,
      description: level.description,
      memberCount: level.members.length,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
    }))

    return NextResponse.json(formattedLevels)
  } catch (error) {
    console.error("Error fetching levels:", error)
    return NextResponse.json({ error: "Failed to fetch levels" }, { status: 500 })
  }
}

// Create a new level
export async function POST(request: NextRequest) {
  try {
    const { organizationId, name, levelNumber, description } = await request.json()

    if (!organizationId || !name || levelNumber === undefined) {
      return NextResponse.json(
        { error: "Organization ID, name, and level number are required" },
        { status: 400 }
      )
    }

    // Validate level number is a positive integer
    if (!Number.isInteger(levelNumber) || levelNumber < 1) {
      return NextResponse.json(
        { error: "Level number must be a positive integer" },
        { status: 400 }
      )
    }

    // Check if level with same level number already exists
    const existingLevelByNumber = await prisma.level.findFirst({
      where: {
        organizationId,
        levelNumber,
      },
    })

    if (existingLevelByNumber) {
      return NextResponse.json(
        { error: `A level with level number ${levelNumber} already exists` },
        { status: 409 }
      )
    }

    // Check if level with same name already exists
    const existingLevelByName = await prisma.level.findFirst({
      where: {
        organizationId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    })

    if (existingLevelByName) {
      return NextResponse.json(
        { error: "A level with this name already exists" },
        { status: 409 }
      )
    }

    const level = await prisma.level.create({
      data: {
        organizationId,
        name,
        levelNumber,
        description: description || null,
      },
    })

    // Format response
    const formattedLevel = {
      id: level.id,
      name: level.name,
      levelNumber: level.levelNumber,
      description: level.description,
      memberCount: 0,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
    }

    return NextResponse.json(formattedLevel, { status: 201 })
  } catch (error) {
    console.error("Error creating level:", error)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      if (error.message.includes("levelNumber")) {
        return NextResponse.json(
          { error: "A level with this level number already exists" },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: "A level with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create level" }, { status: 500 })
  }
}

