import { prisma } from "@/lib/db"
import { indexResourceContent } from "@/lib/pgvector"
import { CreateResourceSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import "server-only"
import { extractTextFromPdfBuffer } from "@/lib/pdf.server"

export const runtime = "nodejs"

/**
 * Helper function to extract text from uploaded files
 * Converts File objects to Buffer for server-side processing
 */
function fileKind(file: File): "pdf" | "text" | "unsupported" {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown")
  ) {
    return "text"
  }
  return "unsupported"
}

async function extractTextFromFile(file: File): Promise<string> {
  const kind = fileKind(file)

  if (kind === "pdf") {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return await extractTextFromPdfBuffer(buffer)
  }

  if (kind === "text") {
    return await file.text()
  }

  throw new Error(
    `Unsupported file type${file.type ? `: ${file.type}` : ""}. Supported types: PDF, TXT, Markdown`
  )
}

// Get library resources for an organization
export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const resources = await prisma.courseResource.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(resources)
  } catch (error) {
    console.error("Error fetching resources:", error)
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 })
  }
}

// Create a new resource
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const title = formData.get("title") as string
    const organizationId = formData.get("organizationId") as string
    const inputType = formData.get("inputType") as "file" | "text"
    const content = formData.get("content") as string | null
    const file = formData.get("file") as File | null

    // Validate basic fields
    const validationResult = CreateResourceSchema.safeParse({
      organizationId,
      title,
      inputType,
      content: inputType === "text" ? content : undefined,
    })

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    let resourceContent = ""
    let resourceUrl: string | null = null
    let resourceType = "text"

    // Handle file upload
    if (inputType === "file" && file) {
      resourceType = fileKind(file) === "pdf" ? "pdf" : "document"
      
      // Extract text content from file
      resourceContent = await extractTextFromFile(file)

      // In production, you'd upload the file to S3/storage and store the URL
      // For now, we'll just store the content
      // resourceUrl = await uploadFileToStorage(file)
      
      // For MVP, we can store file metadata
      resourceUrl = `file:${file.name}` // Placeholder
    } else if (inputType === "text" && content) {
      resourceContent = content
      resourceType = "text"
    } else {
      return NextResponse.json(
        { error: "Either file or content must be provided" },
        { status: 400 }
      )
    }

    if (!resourceContent || resourceContent.trim().length === 0) {
      return NextResponse.json(
        { error: "Resource content cannot be empty" },
        { status: 400 }
      )
    }

    // Create resource in database
    const resource = await prisma.courseResource.create({
      data: {
        organizationId,
        title,
        type: resourceType,
        url: resourceUrl,
        content: resourceContent,
      },
    })

    // Index content to pgvector for AI retrieval
    try {
      await indexResourceContent(resource.id, resourceContent, {
        resourceId: resource.id,
        organizationId,
        title: resource.title,
        type: resource.type,
      })
    } catch (error) {
      console.error("Error indexing resource to pgvector:", error)
      // Don't fail the request if indexing fails, but log it
    }

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error("Error creating resource:", error)
    if (error instanceof ZodError) {
      const errors = error.errors.map((err) => ({
        code: err.code,
        message: err.message,
        path: err.path,
      }))
      return NextResponse.json({ error: errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create resource" },
      { status: 500 }
    )
  }
}
