import { extractTextFromPdfBuffer } from "@/lib/pdf.server"
import { structureDocumentOutline, structureTopicOutline } from "@/lib/course-outline"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let mode: "document" | "topic" = "document"
    let text = ""
    let topic = ""

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      mode = form.get("mode") === "topic" ? "topic" : "document"
      topic = String(form.get("topic") || "")
      text = String(form.get("text") || "")
      const file = form.get("file")
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer())
        text = await extractTextFromPdfBuffer(buffer)
      }
    } else {
      const body = await request.json()
      mode = body.mode === "topic" ? "topic" : "document"
      topic = typeof body.topic === "string" ? body.topic : ""
      text = typeof body.text === "string" ? body.text : ""
    }

    if (mode === "topic" && !topic.trim()) {
      return NextResponse.json({ error: "Enter a topic to build an outline" }, { status: 400 })
    }
    if (mode === "document" && !text.trim()) {
      return NextResponse.json({ error: "Upload a PDF or paste the document text" }, { status: 400 })
    }

    const outline =
      mode === "topic"
        ? await structureTopicOutline(topic)
        : await structureDocumentOutline(text)

    return NextResponse.json(outline)
  } catch (error) {
    console.error("Error structuring course outline:", error)
    const message = error instanceof Error ? error.message : "Failed to build the outline"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
