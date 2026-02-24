"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LexicalEditor } from "@/components/editor"
import { uploadImage, uploadVideo, type Slide, type SlidesData } from "@/lib/api-calls"
import { Plus, Trash2, GripVertical, Image, Video, Loader2, Eye } from "lucide-react"
import { toast } from "sonner"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { v4 as uuidv4 } from "uuid"

interface SlideEditorProps {
  slides: Slide[]
  onChange: (slides: Slide[]) => void
  disabled?: boolean
}

export function SlideEditor({ slides, onChange, disabled = false }: SlideEditorProps) {
  const [uploadingMedia, setUploadingMedia] = useState<{ slideId: string; type: "image" | "video" } | null>(null)

  const addSlide = useCallback(() => {
    const newSlide: Slide = {
      id: uuidv4(),
      order: slides.length,
      title: "",
      content: {
        type: "lexical",
        editorState: JSON.stringify({
          root: {
            children: [
              {
                children: [],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1,
          },
        }),
      },
      media: {
        type: "none",
      },
      layout: "text-media",
    }
    onChange([...slides, newSlide])
  }, [slides, onChange])

  const removeSlide = useCallback(
    (slideId: string) => {
      const updatedSlides = slides.filter((s) => s.id !== slideId).map((s, index) => ({ ...s, order: index }))
      onChange(updatedSlides)
    },
    [slides, onChange]
  )

  const updateSlide = useCallback(
    (slideId: string, updates: Partial<Slide>) => {
      const updatedSlides = slides.map((slide) => (slide.id === slideId ? { ...slide, ...updates } : slide))
      onChange(updatedSlides)
    },
    [slides, onChange]
  )

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(slides)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order numbers
    const reordered = items.map((item, index) => ({ ...item, order: index }))
    onChange(reordered)
  }

  const handleImageUpload = async (slideId: string, file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP).",
      })
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "File size exceeds maximum limit of 10MB",
      })
      return
    }

    setUploadingMedia({ slideId, type: "image" })

    try {
      const response = await uploadImage(file)
      if (response.data?.url) {
        updateSlide(slideId, {
          media: {
            type: "image",
            url: response.data.url,
          },
        })
        toast.success("Image uploaded successfully")
      } else if (response.error) {
        const errorMsg = typeof response.error === "string" ? response.error : response.error?.message || "Failed to upload image"
        toast.error("Failed to upload image", { description: errorMsg })
      }
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image", {
        description: error?.message || "An error occurred while uploading the image.",
      })
    } finally {
      setUploadingMedia(null)
    }
  }

  const handleVideoUpload = async (slideId: string, file: File) => {
    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a valid video file (MP4, WebM, OGG, MOV, or AVI).",
      })
      return
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024 // 500MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "File size exceeds maximum limit of 500MB",
      })
      return
    }

    setUploadingMedia({ slideId, type: "video" })

    try {
      const response = await uploadVideo(file)
      if (response.data?.url) {
        updateSlide(slideId, {
          media: {
            type: "video",
            url: response.data.url,
            thumbnail: response.data.url, // Use video URL as thumbnail for now
          },
        })
        toast.success("Video uploaded successfully")
      } else if (response.error) {
        const errorMsg = typeof response.error === "string" ? response.error : response.error?.message || "Failed to upload video"
        toast.error("Failed to upload video", { description: errorMsg })
      }
    } catch (error: any) {
      console.error("Error uploading video:", error)
      toast.error("Failed to upload video", {
        description: error?.message || "An error occurred while uploading the video.",
      })
    } finally {
      setUploadingMedia(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[#65B32E]">Slides</Label>
          <p className="text-xs text-muted-foreground">Create a presentation-style lesson with slides</p>
        </div>
        <Button
          type="button"
          onClick={addSlide}
          disabled={disabled}
          className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
          size="sm"
        >
          <Plus size={16} className="mr-2" />
          Add Slide
        </Button>
      </div>

      {slides.length === 0 ? (
        <Card className="border-[#65B32E]/20 bg-[#65B32E]/5">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No slides yet. Click "Add Slide" to get started.</p>
            <Button
              type="button"
              onClick={addSlide}
              disabled={disabled}
              className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
            >
              <Plus size={16} className="mr-2" />
              Add First Slide
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="slides">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {slides.map((slide, index) => (
                  <Draggable key={slide.id} draggableId={slide.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? "opacity-50" : ""}`}
                      >
                        <SlideItem
                          slide={slide}
                          index={index}
                          onUpdate={(updates) => updateSlide(slide.id, updates)}
                          onRemove={() => removeSlide(slide.id)}
                          onImageUpload={(file) => handleImageUpload(slide.id, file)}
                          onVideoUpload={(file) => handleVideoUpload(slide.id, file)}
                          isUploading={uploadingMedia?.slideId === slide.id}
                          uploadType={uploadingMedia?.slideId === slide.id ? uploadingMedia.type : undefined}
                          disabled={disabled}
                          dragHandleProps={provided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}

interface SlideItemProps {
  slide: Slide
  index: number
  onUpdate: (updates: Partial<Slide>) => void
  onRemove: () => void
  onImageUpload: (file: File) => void
  onVideoUpload: (file: File) => void
  isUploading: boolean
  uploadType?: "image" | "video"
  disabled?: boolean
  dragHandleProps: any
}

function SlideItem({
  slide,
  index,
  onUpdate,
  onRemove,
  onImageUpload,
  onVideoUpload,
  isUploading,
  uploadType,
  disabled = false,
  dragHandleProps,
}: SlideItemProps) {
  const [showPreview, setShowPreview] = useState(false)

  const handleEditorChange = (editorState: string, format: "html" | "json") => {
    if (format === "json") {
      onUpdate({
        content: {
          type: "lexical",
          editorState,
        },
      })
    }
  }

  const handleMediaTypeChange = (type: "image" | "video" | "none") => {
    if (type === "none") {
      onUpdate({
        media: {
          type: "none",
        },
      })
    } else {
      onUpdate({
        media: {
          type,
          url: undefined,
          thumbnail: undefined,
        },
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === "image") {
        onImageUpload(file)
      } else {
        onVideoUpload(file)
      }
    }
    // Reset input
    e.target.value = ""
  }

  return (
    <Card className="border-[#65B32E]/20 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-[#65B32E]">
              <GripVertical size={20} />
            </div>
            <CardTitle className="text-lg">Slide {index + 1}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[#65B32E] hover:bg-[#65B32E]/10"
            >
              <Eye size={16} className="mr-1" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              className="text-[#DE1915] hover:bg-[#DE1915]/10"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slide Title */}
        <div className="space-y-2">
          <Label htmlFor={`slide-title-${slide.id}`}>Slide Title (Optional)</Label>
          <Input
            id={`slide-title-${slide.id}`}
            value={slide.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter slide title..."
            disabled={disabled}
            className="border-[#65B32E]/30"
          />
        </div>

        {showPreview ? (
          <SlidePreview slide={slide} />
        ) : (
          <>
            {/* Rich Text Editor */}
            <div className="space-y-2">
              <Label>Content</Label>
              <LexicalEditor
                initialEditorState={slide.content.editorState}
                onChange={handleEditorChange}
                placeholder="Enter slide content..."
                outputFormat="json"
                showToolbar={true}
                className="min-h-[200px]"
              />
            </div>

            {/* Media Section */}
            <div className="space-y-2">
              <Label>Media</Label>
              <div className="flex items-center gap-4">
                <Select
                  value={slide.media.type}
                  onValueChange={handleMediaTypeChange}
                  disabled={disabled || isUploading}
                >
                  <SelectTrigger className="w-[180px] border-[#65B32E]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#65B32E]/20">
                    <SelectItem value="none">No Media</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>

                {slide.media.type !== "none" && (
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`media-upload-${slide.id}`}
                      className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-[#65B32E]/30 rounded-md hover:bg-[#65B32E]/10 text-[#65B32E]"
                    >
                      {slide.media.type === "image" ? (
                        <>
                          <Image size={16} />
                          Upload Image
                        </>
                      ) : (
                        <>
                          <Video size={16} />
                          Upload Video
                        </>
                      )}
                    </Label>
                    <Input
                      id={`media-upload-${slide.id}`}
                      type="file"
                      accept={slide.media.type === "image" ? "image/*" : "video/*"}
                      onChange={(e) => handleFileChange(e, slide.media.type as "image" | "video")}
                      disabled={disabled || isUploading}
                      className="hidden"
                    />
                    {isUploading && uploadType === slide.media.type && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#65B32E]" />
                    )}
                  </div>
                )}
              </div>

              {/* Media Preview */}
              {slide.media.type !== "none" && slide.media.url && (
                <div className="mt-2">
                  {slide.media.type === "image" ? (
                    <img
                      src={slide.media.url}
                      alt="Slide media"
                      className="max-w-full h-auto max-h-64 rounded-md border border-[#65B32E]/20"
                    />
                  ) : (
                    <video
                      src={slide.media.url}
                      controls
                      className="max-w-full h-auto max-h-64 rounded-md border border-[#65B32E]/20"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}
            </div>

            {/* Layout Selector */}
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select
                value={slide.layout}
                onValueChange={(value) => onUpdate({ layout: value as Slide["layout"] })}
                disabled={disabled}
              >
                <SelectTrigger className="border-[#65B32E]/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#65B32E]/20">
                  <SelectItem value="text-media">Text Above, Media Below</SelectItem>
                  <SelectItem value="media-text">Media Above, Text Below</SelectItem>
                  <SelectItem value="text-only">Text Only</SelectItem>
                  <SelectItem value="media-only">Media Only</SelectItem>
                  <SelectItem value="split">Text Left, Media Right</SelectItem>
                  <SelectItem value="split-reverse">Media Left, Text Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Simple preview component
function SlidePreview({ slide }: { slide: Slide }) {
  // Parse Lexical editor state to display
  let contentHtml = ""
  try {
    const editorState = JSON.parse(slide.content.editorState)
    // For now, just show a placeholder - we'll render the actual content in the viewer
    contentHtml = "Rich text content"
  } catch {
    contentHtml = "Content"
  }

  return (
    <div className="border border-[#65B32E]/20 rounded-md p-6 bg-gradient-to-br from-white to-[#65B32E]/5 min-h-[400px]">
      {slide.title && <h2 className="text-2xl font-bold mb-4 text-[#65B32E]">{slide.title}</h2>}
      <div className="text-sm text-muted-foreground mb-4">{contentHtml}</div>
      {slide.media.type !== "none" && slide.media.url && (
        <div className="mt-4">
          {slide.media.type === "image" ? (
            <img src={slide.media.url} alt="Preview" className="max-w-full h-auto rounded-md" />
          ) : (
            <video src={slide.media.url} controls className="max-w-full h-auto rounded-md">
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      )}
    </div>
  )
}

