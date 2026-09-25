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

type PdfGlobals = typeof globalThis & {
  DOMMatrix?: new (init?: number[] | string) => {
    multiplySelf: () => unknown
    preMultiplySelf: () => unknown
    translate: () => unknown
    translateSelf: () => unknown
    scale: () => unknown
    scaleSelf: () => unknown
    rotateSelf: () => unknown
    invertSelf: () => unknown
  }
  ImageData?: new (...args: unknown[]) => unknown
  Path2D?: new (...args: unknown[]) => unknown
}

/**
 * pdf.js expects browser geometry classes. Vercel's Node process does not
 * provide them, and the optional native canvas package often fails to load there.
 */
function ensurePdfGlobals() {
  const globals = globalThis as PdfGlobals

  if (typeof globals.DOMMatrix === "undefined") {
    class DOMMatrixPolyfill {
      a = 1
      b = 0
      c = 0
      d = 1
      e = 0
      f = 0
      is2D = true

      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length >= 6) {
          ;[this.a, this.b, this.c, this.d, this.e, this.f] = init
        }
      }

      multiplySelf() {
        return this
      }
      preMultiplySelf() {
        return this
      }
      translate() {
        return new DOMMatrixPolyfill()
      }
      translateSelf() {
        return this
      }
      scale() {
        return new DOMMatrixPolyfill()
      }
      scaleSelf() {
        return this
      }
      rotateSelf() {
        return this
      }
      invertSelf() {
        return this
      }
    }

    globals.DOMMatrix = DOMMatrixPolyfill
  }

  if (typeof globals.ImageData === "undefined") {
    class ImageDataPolyfill {
      data: Uint8ClampedArray
      width: number
      height: number

      constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
        if (typeof dataOrWidth === "number") {
          this.width = dataOrWidth
          this.height = widthOrHeight
          this.data = new Uint8ClampedArray(this.width * this.height * 4)
        } else {
          this.data = dataOrWidth
          this.width = widthOrHeight
          this.height = height ?? 0
        }
      }
    }

    globals.ImageData = ImageDataPolyfill as unknown as PdfGlobals["ImageData"]
  }

  if (typeof globals.Path2D === "undefined") {
    class Path2DPolyfill {
      addPath() {}
      closePath() {}
      moveTo() {}
      lineTo() {}
      bezierCurveTo() {}
      quadraticCurveTo() {}
      arc() {}
      arcTo() {}
      ellipse() {}
      rect() {}
    }

    globals.Path2D = Path2DPolyfill as unknown as PdfGlobals["Path2D"]
  }
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    ensurePdfGlobals()
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

