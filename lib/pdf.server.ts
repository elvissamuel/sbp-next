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
type PdfParser = {
  getText: (params?: { pageJoiner?: string }) => Promise<{ text: string }>
  destroy: () => Promise<void>
}

type PdfParseModule = {
  PDFParse?: new (options: { data: Uint8Array }) => PdfParser
  default?: ((buffer: Buffer) => Promise<{ text: string }>) | PdfParseModule
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = require("pdf-parse") as PdfParseModule | ((buffer: Buffer) => Promise<{ text: string }>)
    let text = ""

    if (typeof pdfParseModule === "function") {
      const pdfData = await pdfParseModule(buffer)
      text = pdfData.text
    } else {
      const PDFParse = pdfParseModule.PDFParse
      const legacyParse = typeof pdfParseModule.default === "function" ? pdfParseModule.default : undefined

      if (typeof PDFParse === "function") {
        const parser = new PDFParse({ data: new Uint8Array(buffer) })
        try {
          const pdfData = await parser.getText({ pageJoiner: "\n\n" })
          text = pdfData.text
        } finally {
          await parser.destroy()
        }
      } else if (legacyParse) {
        const pdfData = await legacyParse(buffer)
        text = pdfData.text
      } else {
        throw new Error("pdf-parse did not export a PDF parser")
      }
    }

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

