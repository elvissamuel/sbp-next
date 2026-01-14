import { type NextRequest, NextResponse } from "next/server"

// Helper function to extract text from PDF using pdfjs-dist
async function extractTextFromPdfFile(file: File): Promise<string> {
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
      
      if (textContent.items.length === 0) {
        continue
      }
      
      // Process text items with positioning information to preserve formatting
      const items = textContent.items as Array<{
        str: string
        transform?: number[]
        width?: number
        hasEOL?: boolean
      }>
      
      // Group items by Y coordinate (line) to preserve line structure
      const lines = new Map<number, Array<{ text: string; x: number; width: number }>>()
      
      for (const item of items) {
        const text = item.str || ""
        if (!text) continue
        
        const transform = item.transform || []
        const x = transform[4] || 0 // x position
        const width = item.width || (text.length * 6) // approximate width
        const y = Math.round((transform[5] || 0) * 10) / 10 // y position (rounded to group similar Y values)
        
        if (!lines.has(y)) {
          lines.set(y, [])
        }
        lines.get(y)!.push({ text, x, width })
      }
      
      // Sort lines by Y coordinate (top to bottom)
      const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0])
      
      let pageText = ""
      for (const [y, lineItems] of sortedLines) {
        // Sort items on the line by X coordinate (left to right)
        lineItems.sort((a, b) => a.x - b.x)
        
        // Join items intelligently - only add space if there's a gap
        let lineText = ""
        for (let i = 0; i < lineItems.length; i++) {
          const current = lineItems[i]
          const prev = i > 0 ? lineItems[i - 1] : null
          
          if (prev) {
            // Calculate the expected end position of previous item
            const prevEndX = prev.x + prev.width
            const gap = current.x - prevEndX
            
            // Only add space if gap is significant (more than 3 units)
            // This prevents spaces between letters in the same word
            if (gap > 3) {
              lineText += " "
            }
          }
          
          lineText += current.text
        }
        
        if (lineText.trim()) {
          pageText += lineText + '\n'
        }
      }
      
      // Add page break
      if (pageText.trim()) {
        fullText += pageText.trim() + '\n\n'
      }
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

