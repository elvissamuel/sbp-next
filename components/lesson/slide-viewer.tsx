"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { LexicalEditor } from "@/components/editor"
import { type Slide } from "@/lib/api-calls"
import { SlideImageFrame } from "@/components/lesson/slide-image-frame"

interface SlideViewerProps {
  slides: Slide[]
  onComplete?: () => void
}

export function SlideViewer({ slides, onComplete }: SlideViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const sortedSlides = [...slides].sort((a, b) => a.order - b.order)
  const currentSlide = sortedSlides[currentSlideIndex]

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentSlideIndex > 0) {
        setCurrentSlideIndex(currentSlideIndex - 1)
      } else if (e.key === "ArrowRight" && currentSlideIndex < sortedSlides.length - 1) {
        setCurrentSlideIndex(currentSlideIndex + 1)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentSlideIndex, sortedSlides.length])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      return
    }
  }

  const goToPrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentSlideIndex < sortedSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    } else if (onComplete) {
      onComplete()
    }
  }

  if (!currentSlide) {
    return null
  }

  const { layout, media, content, title } = currentSlide
  const hasMedia = media.type !== "none" && media.url
  const hasContent = content?.editorState
  const isImageSlide = media.type === "image" && !!media.url

  const getLayoutClasses = () => {
    switch (layout) {
      case "text-only":
        return "flex flex-col w-full"
      case "media-only":
        return "flex flex-col w-full"
      case "text-media":
        return "flex flex-col md:flex-row gap-8 w-full"
      case "media-text":
        return "flex flex-col md:flex-row-reverse gap-8 w-full"
      case "split":
        return "grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
      case "split-reverse":
        return "grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
      default:
        return "flex flex-col md:flex-row gap-8 w-full"
    }
  }

  return (
    <div ref={rootRef} className={isFullscreen ? "bg-[#FAFAFA] p-6 h-screen overflow-auto" : "space-y-4"}>
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          onClick={goToPrevious}
          disabled={currentSlideIndex === 0}
          className="h-12 w-12 rounded-none bg-[#0F766E] hover:bg-[#0F766E]/90 disabled:opacity-40 disabled:hover:bg-[#0F766E]"
        >
          <ChevronLeft size={18} />
        </Button>

        <div className="flex-1 h-12 bg-white border border-border/40 flex items-center justify-center gap-4 px-4">
          <span className="text-sm font-medium text-[#111827]">Previous Slide</span>
          <span className="px-4 py-2 rounded-md bg-[#F3F4F6] text-sm text-[#111827]">{currentSlideIndex + 1}/{sortedSlides.length}</span>
          <span className="text-sm font-medium text-[#111827]">Next slide</span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={toggleFullscreen}
            variant="outline"
            className="h-12 px-4 rounded-none border border-border/40 bg-white hover:bg-[#F3F4F6] text-[#111827]"
          >
            {isFullscreen ? "Exit" : "Full screen"}
          </Button>

          <Button
            type="button"
            onClick={goToNext}
            disabled={currentSlideIndex === sortedSlides.length - 1}
            className="h-12 w-12 rounded-none bg-[#0F766E] hover:bg-[#0F766E]/90 disabled:opacity-40 disabled:hover:bg-[#0F766E]"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      {/* Image slides: full-view image only (no title, no body text) */}
      {isImageSlide ? (
        <div className="relative bg-[#E6E6E6] rounded-2xl overflow-hidden flex flex-col min-h-[420px]">
          <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <div className="w-full h-full min-h-0 flex items-center justify-center [&_*]:select-none">
              <SlideImageFrame src={media.url!} title={title} mode="contain" className="bg-transparent shadow-none ring-0" />
            </div>
          </div>
        </div>
      ) : (
        /* Non-image slides: title + text / video as before */
        <div className="relative bg-[#E6E6E6] rounded-2xl overflow-hidden min-h-[420px] flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 flex flex-col">
            {title && (
              <h2 className="text-2xl md:text-3xl font-bold text-[#111827] mb-6 leading-tight">
                {title}
              </h2>
            )}

            <div className={`flex-1 min-h-0 ${getLayoutClasses()}`}>
              {layout === "split-reverse" ? (
                <>
                  {hasMedia && (
                    <div className="flex-1 flex items-center justify-center min-h-[280px] min-w-0">
                      {media.type === "video" && media.url && (
                        <div className="w-full h-full rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                          <video
                            controls
                            className="w-full h-full max-h-[500px]"
                            src={media.url}
                            poster={media.thumbnail}
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>
                  )}
                  {hasContent && (
                    <div className="flex-1 flex flex-col justify-center min-h-[300px]">
                      <div className="text-[#111827] [&_h1]:text-[#0F766E] [&_h1]:font-bold [&_h2]:text-[#0F766E] [&_h2]:font-bold [&_h3]:text-[#0F766E] [&_h3]:font-bold [&_h4]:text-[#0F766E] [&_h4]:font-bold [&_h5]:text-[#0F766E] [&_h5]:font-bold [&_h6]:text-[#0F766E] [&_h6]:font-bold [&_p]:text-[#111827] [&_p]:text-base [&_li]:text-[#111827] [&_li]:text-base [&_strong]:text-[#0F766E] [&_strong]:font-bold [&_em]:text-[#111827] [&_a]:text-[#0F766E] [&_a]:underline [&_a]:hover:text-[#0F766E]/80">
                        <LexicalEditor
                          initialEditorState={content.editorState}
                          editable={false}
                          showToolbar={false}
                          outputFormat="html"
                          transparent={true}
                          className="[&_.lexical-editor-wrapper_.prose]:text-[#111827] [&_.lexical-editor-wrapper_.prose]:bg-transparent [&_.lexical-editor-wrapper_.prose]:max-w-none [&_.lexical-editor-wrapper_contentEditable]:text-[#111827] [&_.lexical-editor-wrapper_contentEditable]:bg-transparent"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {hasContent && layout !== "media-only" && (
                    <div
                      className={`flex-1 flex flex-col justify-center ${
                        layout === "text-only" ? "w-full min-h-[350px]" : "min-h-[300px]"
                      }`}
                    >
                      <div className="text-[#111827] [&_h1]:text-[#0F766E] [&_h1]:font-bold [&_h2]:text-[#0F766E] [&_h2]:font-bold [&_h3]:text-[#0F766E] [&_h3]:font-bold [&_h4]:text-[#0F766E] [&_h4]:font-bold [&_h5]:text-[#0F766E] [&_h5]:font-bold [&_h6]:text-[#0F766E] [&_h6]:font-bold [&_p]:text-[#111827] [&_p]:text-base [&_li]:text-[#111827] [&_li]:text-base [&_strong]:text-[#0F766E] [&_strong]:font-bold [&_em]:text-[#111827] [&_a]:text-[#0F766E] [&_a]:underline [&_a]:hover:text-[#0F766E]/80">
                        <LexicalEditor
                          initialEditorState={content.editorState}
                          editable={false}
                          showToolbar={false}
                          outputFormat="html"
                          transparent={true}
                          className="[&_.lexical-editor-wrapper_.prose]:text-[#111827] [&_.lexical-editor-wrapper_.prose]:bg-transparent [&_.lexical-editor-wrapper_.prose]:max-w-none [&_.lexical-editor-wrapper_contentEditable]:text-[#111827] [&_.lexical-editor-wrapper_contentEditable]:bg-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {hasMedia && layout !== "text-only" && (
                    <div
                      className={`flex-1 flex items-center justify-center min-w-0 ${
                        layout === "media-only" ? "w-full min-h-[320px]" : "min-h-[280px]"
                      }`}
                    >
                      {media.type === "video" && media.url && (
                        <div className="w-full h-full rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                          <video
                            controls
                            className="w-full h-full max-h-[500px]"
                            src={media.url}
                            poster={media.thumbnail}
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex gap-1 justify-center px-2">
        {sortedSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentSlideIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlideIndex ? "w-8 bg-[#0F766E]" : "w-2 bg-[#C7C7C7] hover:bg-[#B0B0B0]"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
