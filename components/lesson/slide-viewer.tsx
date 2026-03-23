"use client"

import { useState, useEffect } from "react"
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
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
    <div className="space-y-4">
      {/* Slide Counter and Navigation */}
      <div className="flex items-center justify-between bg-gray-300 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#65B32E] animate-pulse" />
            <span className="text-sm font-semibold text-black">
              Slide <span className="text-black font-bold">{currentSlideIndex + 1}</span> of{" "}
              <span className="text-gray-900">{sortedSlides.length}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={currentSlideIndex === 0}
            className="h-9 px-4 text-black hover:text-black hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200 border border-gray-600/50 hover:border-[#65B32E] bg-gray-800/30"
          >
            <ChevronLeft size={18} className="mr-1.5" />
            Previous
          </Button>
          <div className="h-6 w-px bg-gray-600" />
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={currentSlideIndex === sortedSlides.length - 1}
            className="h-9 px-4 text-black hover:text-black hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200 border border-gray-600/50 hover:border-[#65B32E] bg-gray-800/30"
          >
            Next
            <ChevronRight size={18} className="ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Image slides: full-view image only (no title, no body text) */}
      {isImageSlide ? (
        <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[min(85vh,920px)] max-h-[min(92vh,1100px)]">
          <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-4 md:p-6">
            <div className="w-full h-full min-h-0 flex items-center justify-center [&_*]:select-none">
              <SlideImageFrame
                src={media.url!}
                title={title}
                mode="contain"
                className="bg-black/40 ring-1 ring-white/15 shadow-2xl"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Non-image slides: title + text / video as before */
        <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-2xl shadow-2xl overflow-hidden min-h-[500px] max-h-[min(92vh,1100px)] flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 flex flex-col">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-[#65B32E] mb-6 leading-tight">
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
                      <div className="text-gray-200 [&_h1]:text-[#65B32E] [&_h1]:font-bold [&_h2]:text-[#65B32E] [&_h2]:font-bold [&_h3]:text-[#65B32E] [&_h3]:font-bold [&_h4]:text-[#65B32E] [&_h4]:font-bold [&_h5]:text-[#65B32E] [&_h5]:font-bold [&_h6]:text-[#65B32E] [&_h6]:font-bold [&_p]:text-gray-200 [&_p]:text-lg [&_li]:text-gray-200 [&_li]:text-lg [&_strong]:text-[#65B32E] [&_strong]:font-bold [&_em]:text-gray-200 [&_a]:text-[#65B32E] [&_a]:underline [&_a]:hover:text-[#65B32E]/80">
                        <LexicalEditor
                          initialEditorState={content.editorState}
                          editable={false}
                          showToolbar={false}
                          outputFormat="html"
                          transparent={true}
                          className="[&_.lexical-editor-wrapper_.prose]:text-gray-200 [&_.lexical-editor-wrapper_.prose]:bg-transparent [&_.lexical-editor-wrapper_.prose]:max-w-none [&_.lexical-editor-wrapper_contentEditable]:text-gray-200 [&_.lexical-editor-wrapper_contentEditable]:bg-transparent"
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
                      <div className="text-gray-200 [&_h1]:text-[#65B32E] [&_h1]:font-bold [&_h2]:text-[#65B32E] [&_h2]:font-bold [&_h3]:text-[#65B32E] [&_h3]:font-bold [&_h4]:text-[#65B32E] [&_h4]:font-bold [&_h5]:text-[#65B32E] [&_h5]:font-bold [&_h6]:text-[#65B32E] [&_h6]:font-bold [&_p]:text-gray-200 [&_p]:text-lg [&_li]:text-gray-200 [&_li]:text-lg [&_strong]:text-[#65B32E] [&_strong]:font-bold [&_em]:text-gray-200 [&_a]:text-[#65B32E] [&_a]:underline [&_a]:hover:text-[#65B32E]/80">
                        <LexicalEditor
                          initialEditorState={content.editorState}
                          editable={false}
                          showToolbar={false}
                          outputFormat="html"
                          transparent={true}
                          className="[&_.lexical-editor-wrapper_.prose]:text-gray-200 [&_.lexical-editor-wrapper_.prose]:bg-transparent [&_.lexical-editor-wrapper_.prose]:max-w-none [&_.lexical-editor-wrapper_contentEditable]:text-gray-200 [&_.lexical-editor-wrapper_contentEditable]:bg-transparent"
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
              index === currentSlideIndex ? "w-8 bg-[#65B32E]" : "w-2 bg-gray-500/50 hover:bg-gray-400/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
