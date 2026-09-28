import { createHash } from "crypto"

export const CLOUDINARY_FOLDERS = {
  lessons: "lessons",
  courses: "courses",
  organizationLogos: "organizations/logos",
} as const

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS]
export type CloudinaryResourceType = "image" | "video"

const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"]

const folderRules: Record<CloudinaryFolder, { resourceType: CloudinaryResourceType; maxSize: number; types: string[] }> = {
  lessons: { resourceType: "video", maxSize: 500 * 1024 * 1024, types: videoTypes },
  courses: { resourceType: "image", maxSize: 10 * 1024 * 1024, types: imageTypes },
  "organizations/logos": { resourceType: "image", maxSize: 5 * 1024 * 1024, types: imageTypes },
}

export function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.")
  }

  return { cloudName, apiKey, apiSecret }
}

export function assertCloudinaryUpload(input: {
  folder: string
  resourceType: string
  contentType: string
  fileSize: number
}): { folder: CloudinaryFolder; resourceType: CloudinaryResourceType } {
  const rule = folderRules[input.folder as CloudinaryFolder]
  if (!rule) {
    throw new Error("This upload folder is not allowed")
  }
  if (input.resourceType !== rule.resourceType) {
    throw new Error("This file type cannot be stored in that folder")
  }
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    throw new Error("File size is required")
  }
  if (!rule.types.includes(input.contentType)) {
    throw new Error(rule.resourceType === "video"
      ? "Invalid file type. Only video files (MP4, WebM, OGG, QuickTime, AVI) are supported."
      : "Invalid file type. Only image files (JPEG, PNG, WebP, GIF, SVG) are supported.")
  }
  if (input.fileSize > rule.maxSize) {
    const maxMb = Math.round(rule.maxSize / (1024 * 1024))
    throw new Error(`File size exceeds maximum limit of ${maxMb}MB`)
  }
  return { folder: input.folder as CloudinaryFolder, resourceType: rule.resourceType }
}

export function signCloudinaryUpload(folder: string, apiSecret: string) {
  const timestamp = Math.round(Date.now() / 1000)
  const params = `folder=${folder}&timestamp=${timestamp}`
  const signature = createHash("sha1").update(params + apiSecret).digest("hex")
  return { timestamp, signature, folder }
}
