"use client"

import { SLIDE_MEDIA_DISPLAY_MAX_WIDTH_PX } from "@/lib/slide-presentation"

type SlideImageFrameProps = {
  src: string
  title?: string
  className?: string
  /**
   * Default "frame": keeps a 16:9 container (useful in editor/normal views).
   * "contain": fills the parent container's box and uses `object-contain` so the
   * image fully contains the available width/height without cropping.
   */
  mode?: "frame" | "contain"
}

/**
 * 16:9 frame; max width matches AI output (1280px) so 1280×720 images align 1:1 at full width.
 */
export function SlideImageFrame({
  src,
  title,
  className = "",
  mode = "frame",
}: SlideImageFrameProps) {

  if (mode === "contain") {
    // Fill the parent container's dimensions; no enforced 16:9 aspect box.
    return (
      <div className={`w-full h-full rounded-lg overflow-hidden ${className}`}>
        <img
          src={src}
          alt={title || "Slide image"}
          className="block w-full h-full object-contain object-center"
          sizes="100vw"
        />
      </div>
    )
  }

  return (
    <div
      className={`w-full mx-auto rounded-lg overflow-hidden ${className}`}
      style={{ maxWidth: SLIDE_MEDIA_DISPLAY_MAX_WIDTH_PX }}
    >
      <div className="relative w-full pt-[56.25%]">
        <img
          src={src}
          alt={title || "Slide image"}
          className="absolute inset-0 h-full w-full object-contain object-center"
          sizes={`(max-width: ${SLIDE_MEDIA_DISPLAY_MAX_WIDTH_PX}px) 100vw, ${SLIDE_MEDIA_DISPLAY_MAX_WIDTH_PX}px`}
        />
      </div>
    </div>
  )
}
