import { type NextRequest, NextResponse } from "next/server"
import { extractTextFromPdfBuffer } from "@/lib/pdf.server"

// Helper function to extract text from PDF using pdf-parse
async function extractTextFromPdfFile(file: File): Promise<string> {
  try {
    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Use the server-side PDF extraction helper
    return await extractTextFromPdfBuffer(buffer)
  } catch (error) {
    console.error("Error parsing PDF:", error)
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

// Extract text content from uploaded PDF file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are supported." },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds maximum limit of 10MB" },
        { status: 400 }
      )
    }

    // Extract text from PDF
    const content = await extractTextFromPdfFile(file)

    return NextResponse.json({
      content,
      fileName: file.name,
      fileSize: file.size,
    })
  } catch (error) {
    console.error("Error extracting PDF content:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Failed to extract content from PDF"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

