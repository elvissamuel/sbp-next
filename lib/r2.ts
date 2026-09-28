import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const STORAGE_FOLDERS = {
  lessons: "lessons",
  courses: "courses",
  organizationLogos: "organizations/logos",
} as const

export type StorageFolder = (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS]
export type StorageResourceType = "image" | "video"

const imageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
const videoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"]

const folderRules: Record<StorageFolder, { resourceType: StorageResourceType; maxSize: number; types: string[] }> = {
  lessons: { resourceType: "video", maxSize: 500 * 1024 * 1024, types: videoTypes },
  courses: { resourceType: "image", maxSize: 10 * 1024 * 1024, types: imageTypes },
  "organizations/logos": { resourceType: "image", maxSize: 5 * 1024 * 1024, types: imageTypes },
}

export function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL.")
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/$/, "") }
}

export function assertStorageUpload(input: {
  folder: string
  resourceType: string
  contentType: string
  fileSize: number
  fileName: string
}): { folder: StorageFolder; resourceType: StorageResourceType; contentType: string; fileName: string } {
  const rule = folderRules[input.folder as StorageFolder]
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
  const fileName = input.fileName.trim()
  if (!fileName) {
    throw new Error("File name is required")
  }
  return { folder: input.folder as StorageFolder, resourceType: rule.resourceType, contentType: input.contentType, fileName }
}

export async function createR2Upload(input: { folder: StorageFolder; contentType: string; fileName: string }) {
  const config = r2Config()
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `${input.folder}/${Date.now()}-${safeName}`
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: 60 * 60 * 3 },
  )

  const publicUrl = `${config.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`
  return { uploadUrl, publicUrl, contentType: input.contentType }
}
