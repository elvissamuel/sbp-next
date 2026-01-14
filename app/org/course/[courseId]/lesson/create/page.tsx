"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Upload, Video } from "lucide-react"
import { createLesson, getCourseResources, generateLessonContent, extractPdfContent, uploadVideo, type CourseResource } from "@/lib/api-calls"
import { CreateLessonSchema } from "@/lib/validation-schema"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { MarkdownEditor } from "@/components/markdown-editor"

type FormValues = z.infer<typeof CreateLessonSchema>

export default function CreateLessonPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [contentMode, setContentMode] = useState<"manual" | "ai" | "upload">("manual")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)

  // Fetch course resources for selection
  const { data: resourcesResponse, isLoading: resourcesLoading } = useQuery({
    queryKey: ["course-resources", courseId],
    queryFn: () => getCourseResources(courseId),
    enabled: !!courseId,
  })

  const resources = resourcesResponse?.data || []

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateLessonSchema),
    defaultValues: {
      courseId,
      title: "",
      content: "",
      videoUrl: "",
      resourceIds: [],
    },
  })

  const selectedResourceIds = form.watch("resourceIds") || []

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: createLesson,
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Lesson created successfully", {
          description: `The lesson "${response.data.title}" has been created.`,
        })
        router.push(`/org/course/${courseId}`)
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to create lesson"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to create lesson", {
          description: errorMsg,
        })
      } else if (response.validationErrors) {
        const firstError = response.validationErrors[0]
        response.validationErrors.forEach((error) => {
          form.setError(error.field as any, {
            message: error.message,
          })
        })
        toast.error("Validation error", {
          description: firstError.message || "Please check the form for errors.",
        })
      }
    },
    onError: (error: any) => {
      console.error("Error creating lesson:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to create lesson. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to create lesson", {
        description: errorMessage,
      })
    },
  })

  // Handle AI content generation
  const handleGenerateContent = async () => {
    const title = form.getValues("title")
    if (!title || title.trim().length === 0) {
      const errorMsg = "Please enter a lesson title first"
      form.setError("title", {
        message: errorMsg,
      })
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await generateLessonContent(
        courseId,
        title,
        selectedResourceIds.length > 0 ? selectedResourceIds : undefined
      )

      if (response.data?.content) {
        form.setValue("content", response.data.content)
        toast.success("Content generated successfully", {
          description: "The lesson content has been generated. You can edit it before submitting.",
        })
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to generate content"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to generate content", {
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error("Error generating content:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : "Failed to generate content. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to generate content", {
        description: errorMessage,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle file upload and extraction
  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Invalid file type", {
        description: "Only PDF files are supported.",
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

    setSelectedFile(file)
    setIsExtracting(true)

    try {
      const response = await extractPdfContent(file)

      if (response.data?.content) {
        form.setValue("content", response.data.content)
        toast.success("PDF content extracted successfully", {
          description: "The content has been extracted. You can edit it before submitting.",
        })
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to extract content"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to extract content", {
          description: errorMsg,
        })
        setSelectedFile(null)
      }
    } catch (error: any) {
      console.error("Error extracting PDF content:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : "Failed to extract content. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to extract content", {
        description: errorMessage,
      })
      setSelectedFile(null)
    } finally {
      setIsExtracting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle video file upload
  const handleVideoUpload = async (file: File) => {
    // Validate file type
    const validVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ]
    if (!validVideoTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only video files (MP4, WebM, OGG, MOV, AVI) are supported.",
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

    setSelectedVideoFile(file)
    setIsUploadingVideo(true)

    try {
      const response = await uploadVideo(file)

      if (response.data?.url) {
        form.setValue("videoUrl", response.data.url)
        toast.success("Video uploaded successfully", {
          description: "The video has been uploaded. You can now create the lesson.",
        })
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to upload video"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to upload video", {
          description: errorMsg,
        })
        setSelectedVideoFile(null)
      }
    } catch (error: any) {
      console.error("Error uploading video:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : "Failed to upload video. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to upload video", {
        description: errorMessage,
      })
      setSelectedVideoFile(null)
    } finally {
      setIsUploadingVideo(false)
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVideoUpload(file)
    }
  }

  const onSubmit = (values: FormValues) => {
    // Ensure courseId is set
    const submitData = {
      ...values,
      courseId,
      resourceIds: selectedResourceIds.length > 0 ? selectedResourceIds : undefined,
    }
    createLessonMutation.mutate(submitData)
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Lesson</h1>
          <p className="text-muted-foreground">Add a new lesson to your course</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Lesson Information</CardTitle>
            <CardDescription>Provide lesson details and content</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter lesson title"
                  disabled={createLessonMutation.isPending}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Resource Selection */}
              <div className="space-y-2">
                <Label>Reference Resources (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select resources that AI can reference when generating content
                </p>
                {resourcesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading resources...
                  </div>
                ) : resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No resources available. <Link href={`/org/course/resource/upload`} className="text-primary hover:underline">Upload resources</Link> first.
                  </p>
                ) : (
                  <div className="space-y-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                    {resources.map((resource: CourseResource) => (
                      <div key={resource.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`resource-${resource.id}`}
                          checked={selectedResourceIds.includes(resource.id)}
                          onCheckedChange={(checked) => {
                            const current = selectedResourceIds
                            if (checked) {
                              form.setValue("resourceIds", [...current, resource.id])
                            } else {
                              form.setValue("resourceIds", current.filter((id) => id !== resource.id))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`resource-${resource.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {resource.title}
                          <span className="text-muted-foreground ml-2">({resource.type})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Mode Toggle */}
              <div className="space-y-2">
                <Label>Content Source</Label>
                <div className="flex gap-4 flex-wrap">
                  <Button
                    type="button"
                    variant={contentMode === "manual" ? "default" : "outline"}
                    onClick={() => setContentMode("manual")}
                    disabled={createLessonMutation.isPending || isGenerating || isExtracting}
                  >
                    Enter Manually
                  </Button>
                  <Button
                    type="button"
                    variant={contentMode === "ai" ? "default" : "outline"}
                    onClick={() => setContentMode("ai")}
                    disabled={createLessonMutation.isPending || isGenerating || isExtracting}
                  >
                    Generate with AI
                  </Button>
                  <Button
                    type="button"
                    variant={contentMode === "upload" ? "default" : "outline"}
                    onClick={() => setContentMode("upload")}
                    disabled={createLessonMutation.isPending || isGenerating || isExtracting}
                  >
                    <Upload size={16} className="mr-2" />
                    Upload PDF
                  </Button>
                </div>
              </div>

              {/* File Upload Section */}
              {contentMode === "upload" && (
                <div className="space-y-2">
                  <Label>Upload PDF File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      disabled={isExtracting || createLessonMutation.isPending}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <span className="text-sm text-muted-foreground">
                        {selectedFile.name}
                      </span>
                    )}
                    {isExtracting && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting content...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF file (max 10MB). The text content will be extracted and added to the lesson.
                  </p>
                </div>
              )}

              {/* Video Upload Section */}
              <div className="space-y-2">
                <Label htmlFor="video">Video (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="video"
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                    onChange={handleVideoFileChange}
                    disabled={isUploadingVideo || createLessonMutation.isPending}
                    className="cursor-pointer"
                  />
                  {selectedVideoFile && (
                    <span className="text-sm text-muted-foreground">
                      {selectedVideoFile.name} ({(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  )}
                  {isUploadingVideo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading video...
                    </div>
                  )}
                </div>
                {form.watch("videoUrl") && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Video URL:</p>
                    <p className="text-xs font-mono break-all">{form.watch("videoUrl")}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a video file (max 500MB). Supported formats: MP4, WebM, OGG, MOV, AVI.
                </p>
              </div>

              {/* Content Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Lesson Content *</Label>
                  {contentMode === "ai" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateContent}
                      disabled={isGenerating || createLessonMutation.isPending}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Content"
                      )}
                    </Button>
                  )}
                </div>
                <MarkdownEditor
                  value={form.watch("content") || ""}
                  onChange={(value) => form.setValue("content", value)}
                  placeholder={
                    contentMode === "ai"
                      ? "Click 'Generate Content' to create lesson content using AI"
                      : contentMode === "upload"
                      ? "Upload a PDF file to extract content"
                      : "Enter lesson content... (Markdown supported)"
                  }
                  rows={15}
                  disabled={createLessonMutation.isPending || (contentMode === "ai" && isGenerating) || (contentMode === "upload" && isExtracting)}
                />
                {form.formState.errors.content && (
                  <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Supports Markdown formatting. Use the Preview tab to see how it will look.</p>
              </div>

              {/* Error Display */}
              {form.formState.errors.root && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createLessonMutation.isPending || isGenerating || isExtracting}
                >
                  {createLessonMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Lesson"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  asChild
                  disabled={createLessonMutation.isPending || isGenerating || isExtracting}
                >
                  <Link href={`/org/course/${courseId}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
