import { prisma } from "@/lib/db"
import { indexResourceContent } from "@/lib/pgvector"
import { CreateResourceSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

// Helper function to extract text from PDF using pdfjs-dist
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type

  if (fileType === "application/pdf") {
    try {
      // Use pdfjs-dist legacy build for Node.js server-side environment
      // Dynamic import to avoid bundling issues
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
      
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdfDocument = await loadingTask.promise
      
      let fullText = ""
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => {
            // Text items have a 'str' property
            if ('str' in item) {
              return item.str
            }
            return ''
          })
          .join(' ')
        
        fullText += pageText + '\n'
      }
      
      if (!fullText || fullText.trim().length === 0) {
        throw new Error("PDF appears to be empty or contains no extractable text")
      }
      
      return fullText.trim()
    } catch (error) {
      console.error("Error parsing PDF:", error)
      if (error instanceof Error && error.message.includes("Cannot find module")) {
        throw new Error(
          "PDF parsing library not installed. Please run: npm install pdfjs-dist"
        )
      }
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  } else if (
    fileType === "text/plain" ||
    fileType === "text/markdown" ||
    fileType.includes("text/")
  ) {
    return await file.text()
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Supported types: PDF, TXT, Markdown`)
  }
}

// Get all resources for a course
export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const resources = await prisma.courseResource.findMany({
      where: { courseId },
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
    const courseId = formData.get("courseId") as string
    const inputType = formData.get("inputType") as "file" | "text"
    const content = formData.get("content") as string | null
    const file = formData.get("file") as File | null

    // Validate basic fields
    const validationResult = CreateResourceSchema.safeParse({
      courseId,
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

    // Verify course exists and get organizationId
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, organizationId: true },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    let resourceContent = ""
    let resourceUrl: string | null = null
    let resourceType = "text"

    // Handle file upload
    if (inputType === "file" && file) {
      resourceType = file.type === "application/pdf" ? "pdf" : "document"
      
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
        courseId,
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
        courseId: course.id,
        organizationId: course.organizationId,
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
