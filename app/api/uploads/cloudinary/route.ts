import { assertCloudinaryUpload, cloudinaryConfig, signCloudinaryUpload } from "@/lib/cloudinary"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const folder = typeof body.folder === "string" ? body.folder : ""
    const resourceType = typeof body.resourceType === "string" ? body.resourceType : ""
    const contentType = typeof body.contentType === "string" ? body.contentType : ""
    const fileSize = Number(body.fileSize)

    const upload = assertCloudinaryUpload({ folder, resourceType, contentType, fileSize })
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig()
    const signed = signCloudinaryUpload(upload.folder, apiSecret)

    return NextResponse.json({
      cloudName,
      apiKey,
      resourceType: upload.resourceType,
      ...signed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start upload"
    const status = message.includes("not configured") ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
