import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

type Params = { moduleId: string }

async function getModuleId(params: Promise<Params> | Params) {
  const resolved = await Promise.resolve(params)
  return resolved.moduleId
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const moduleId = await getModuleId(params)
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : undefined
    const description = typeof body.description === "string" ? body.description.trim() : undefined

    if (title !== undefined && !title) {
      return NextResponse.json({ error: "Module title is required" }, { status: 400 })
    }

    const existing = await prisma.module.findUnique({ where: { id: moduleId } })
    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const module = await prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
      },
    })

    return NextResponse.json(module)
  } catch (error) {
    console.error("Error updating module:", error)
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const moduleId = await getModuleId(params)
    const existing = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    await prisma.module.delete({ where: { id: moduleId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting module:", error)
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 })
  }
}
