import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = "nodejs"

// Upload video to Vercel Blob Storage
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type (video files)
    const validVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo", // .avi
    ]
    
    if (!validVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files (MP4, WebM, OGG, MOV, AVI) are supported." },
        { status: 400 }
      )
    }

    // Validate file size (max 500MB for videos)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds maximum limit of 500MB" },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `lessons/${timestamp}-${sanitizedName}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
    })
  } catch (error) {
    console.error("Error uploading video:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload video"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

