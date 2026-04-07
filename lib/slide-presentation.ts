/**
 * Slide images: one canonical size for AI generation and the learner viewer.
 * - 1280×720 = 16:9 (720p), matches `aspect-video` / 56.25% padding trick.
 * - Viewer uses a 16:9 frame up to this width so a 1280×720 image maps 1:1 at full desktop width
 *   and scales down proportionally on smaller screens (always fully visible).
 */
export const SLIDE_IMAGE_AI_WIDTH = 1280
export const SLIDE_IMAGE_AI_HEIGHT = 720
export const SLIDE_IMAGE_ASPECT_LABEL = "16:9"

export const ENABLE_SLIDES = process.env.NEXT_PUBLIC_ENABLE_SLIDES === "true"

/** Max width (px) of the slide image frame in the classroom viewer — same as generation width. */
export const SLIDE_MEDIA_DISPLAY_MAX_WIDTH_PX = SLIDE_IMAGE_AI_WIDTH

/** Appended to the user prompt when calling image generation (Replicate / etc.). */
export function buildSlideImageTechnicalPromptSuffix(): string {
  return `\n\nTechnical requirements: Output image at exactly ${SLIDE_IMAGE_AI_WIDTH}×${SLIDE_IMAGE_AI_HEIGHT} pixels (${SLIDE_IMAGE_ASPECT_LABEL}). Match a widescreen slide frame; show the full composition—no cropping of important content. High clarity for full-width display.`
}

// w=1920, h=1080, aspect=16:9
// export const SLIDE_IMAGE_AI_WIDTH_1920 = 1920
// export const SLIDE_IMAGE_AI_HEIGHT_1080 = 1080
// export const SLIDE_IMAGE_ASPECT_LABEL_16_9 = "16:9"

// w=1280, h=720, aspect=16:9
// export const SLIDE_IMAGE_AI_WIDTH_1280 = 1280
// export const SLIDE_IMAGE_AI_HEIGHT_720 = 720
// export const SLIDE_IMAGE_ASPECT_LABEL_16_9 = "16:9"

// w=1024, h=576, aspect=16:9