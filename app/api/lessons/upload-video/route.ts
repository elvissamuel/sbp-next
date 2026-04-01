import { NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

export const runtime = "nodejs"

// Upload video to Vercel Blob Storage
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const validVideoTypes = [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/quicktime",
          "video/x-msvideo",
        ]

        const maxSize = 500 * 1024 * 1024

        const timestamp = Date.now()
        const sanitizedPathname = pathname.replace(/[^a-zA-Z0-9./_-]/g, "_")
        const finalPathname = `lessons/${timestamp}-${sanitizedPathname}`

        return {
          allowedContentTypes: validVideoTypes,
          maximumSizeInBytes: maxSize,
          addRandomSuffix: false,
          pathname: finalPathname,
          tokenPayload: JSON.stringify({}),
        }
      },
      onUploadCompleted: async () => {
        return
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("Error uploading video:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload video"
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }
}

