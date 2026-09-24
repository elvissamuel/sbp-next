import { prisma } from "@/lib/db"
import { deleteFromIndex, indexResourceContent } from "@/lib/pgvector"
import { type NextRequest, NextResponse } from "next/server"

type Params = { resourceId: string }

async function getResourceId(params: Promise<Params> | Params) {
  const resolved = await Promise.resolve(params)
  return resolved.resourceId
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resourceId = await getResourceId(params)
    const resource = await prisma.courseResource.findUnique({
      where: { id: resourceId },
    })

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error("Error fetching resource:", error)
    return NextResponse.json({ error: "Failed to fetch resource" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resourceId = await getResourceId(params)
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const content = typeof body.content === "string" ? body.content.trim() : ""

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const existing = await prisma.courseResource.findUnique({
      where: { id: resourceId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    const resource = await prisma.courseResource.update({
      where: { id: resourceId },
      data: { title, content },
    })

    try {
      await indexResourceContent(resource.id, content, {
        resourceId: resource.id,
        organizationId: resource.organizationId,
        title: resource.title,
        type: resource.type,
      })
    } catch (error) {
      console.error("Error reindexing resource:", error)
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error("Error updating resource:", error)
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const resourceId = await getResourceId(params)
    const existing = await prisma.courseResource.findUnique({
      where: { id: resourceId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    await prisma.courseResource.delete({
      where: { id: resourceId },
    })

    try {
      await deleteFromIndex(resourceId, "resource")
    } catch (error) {
      console.error("Error removing resource from index:", error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting resource:", error)
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 })
  }
}
