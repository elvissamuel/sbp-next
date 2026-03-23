"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkdownEditor } from "@/components/markdown-editor"
import { SlideEditor } from "./slide-editor"
import { type Slide } from "@/lib/api-calls"
import { FileText, Presentation } from "lucide-react"
import {
  SLIDE_IMAGE_AI_HEIGHT,
  SLIDE_IMAGE_AI_WIDTH,
  SLIDE_IMAGE_ASPECT_LABEL,
} from "@/lib/slide-presentation"

interface LessonContentEditorProps {
  content?: string
  slides?: Slide[]
  onContentChange?: (content: string) => void
  onSlidesChange?: (slides: Slide[]) => void
  disabled?: boolean
}

export function LessonContentEditor({
  content = "",
  slides = [],
  onContentChange,
  onSlidesChange,
  disabled = false,
}: LessonContentEditorProps) {
  const [lessonType, setLessonType] = useState<"text" | "slides">(
    slides && slides.length > 0 ? "slides" : "text"
  )

  const handleContentChange = (value: string) => {
    onContentChange?.(value)
  }

  const handleSlidesChange = (updatedSlides: Slide[]) => {
    onSlidesChange?.(updatedSlides)
  }

  return (
    <Tabs value={lessonType} onValueChange={(v) => setLessonType(v as "text" | "slides")} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="text" className="flex items-center gap-2" disabled={disabled}>
          <FileText size={16} />
          Text Content
        </TabsTrigger>
        <TabsTrigger value="slides" className="flex items-center gap-2" disabled={disabled}>
          <Presentation size={16} />
          Slides (Presentation)
        </TabsTrigger>
      </TabsList>
      <TabsContent value="text" className="mt-4">
        <div className="space-y-2">
          <MarkdownEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Enter lesson content... (Markdown supported)"
            rows={15}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">Supports Markdown formatting. Use the Preview tab to see how it will look.</p>
        </div>
      </TabsContent>
      <TabsContent value="slides" className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground rounded-md border border-[#65B32E]/20 bg-[#65B32E]/5 px-3 py-2">
          <strong className="text-[#65B32E]">AI slide images:</strong> generated at{" "}
          {SLIDE_IMAGE_AI_WIDTH}×{SLIDE_IMAGE_AI_HEIGHT}px ({SLIDE_IMAGE_ASPECT_LABEL}) to match the learner view—full
          image visible, not cropped at the bottom.
        </p>
        <SlideEditor
          slides={slides}
          onChange={handleSlidesChange}
          disabled={disabled}
        />
      </TabsContent>
    </Tabs>
  )
}

