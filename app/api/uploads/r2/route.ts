import { assertStorageUpload, createR2Upload } from "@/lib/r2"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const upload = assertStorageUpload({
      folder: typeof body.folder === "string" ? body.folder : "",
      resourceType: typeof body.resourceType === "string" ? body.resourceType : "",
      contentType: typeof body.contentType === "string" ? body.contentType : "",
      fileSize: Number(body.fileSize),
      fileName: typeof body.fileName === "string" ? body.fileName : "",
    })
    const signed = await createR2Upload(upload)
    return NextResponse.json(signed)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start upload"
    const status = message.includes("not configured") ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
