import "server-only"

/**
 * Server-only PDF text extraction using pdf-parse
 * This file must only be imported in server-side code (API routes, server components)
 */

/**
 * Extracts text content from a PDF Buffer using pdf-parse
 * @param buffer - PDF file as a Buffer
 * @returns Extracted text content as a string
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v1.1.1 exports a default function (not a class)
    // Use require() directly in Node.js runtime
    const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>
    
    // Verify it's a function
    if (typeof pdfParse !== "function") {
      throw new Error(
        `pdf-parse module did not export a function. Got: ${typeof pdfParse}. ` +
        `Please ensure you're using pdf-parse version 1.1.1 which exports a default function.`
      )
    }

    // Parse the PDF buffer
    const pdfData = await pdfParse(buffer)

    // Extract text from the PDF
    const text = pdfData.text

    if (!text || text.trim().length === 0) {
      throw new Error("PDF appears to be empty or contains no extractable text")
    }

    return text.trim()
  } catch (error) {
    console.error("Error extracting text from PDF:", error)
    
    if (error instanceof Error) {
      // Provide helpful error messages
      if (error.message.includes("Cannot find module")) {
        throw new Error(
          "PDF parsing library not installed. Please run: npm install pdf-parse"
        )
      }
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
    
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

