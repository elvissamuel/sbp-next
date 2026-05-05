"use client"

import React, { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createCourse, getCourses, uploadImage } from "@/lib/api-calls"
import { CreateCourseSchema } from "@/lib/validation-schema"
import { getPrimaryOrganization } from "@/lib/session"
import { z } from "zod"
import { toast } from "sonner"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"

export default function CreateCoursePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // Get primary organization from session
  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  const { data: subscriptionCheck } = useQuery({
    queryKey: ["subscription-check", organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/check?organizationId=${organizationId}`)
      return res.json()
    },
    enabled: !!organizationId,
  })

  const isFreePlan = subscriptionCheck?.subscription?.plan === "free"

  const { data: coursesResponse } = useQuery({
    queryKey: ["courses", organizationId, "count-for-limit"],
    queryFn: () => getCourses(organizationId),
    enabled: !!organizationId && isFreePlan,
  })

  const existingCoursesCount = coursesResponse?.data?.length || 0
  const freeCourseLimitReached = isFreePlan && existingCoursesCount >= 2

  // Create a form schema without organizationId for the form
  const FormCourseSchema = CreateCourseSchema.omit({ organizationId: true })
  
  type FormCourseValues = z.infer<typeof FormCourseSchema>

  const form = useForm<FormCourseValues>({
    resolver: zodResolver(FormCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      deadline: undefined,
      thumbnail: "",
    },
  })

  const thumbnailValue = form.watch("thumbnail")

  const createCourseMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Course created successfully", {
          description: `The course "${response.data.title}" has been created.`,
        })
        router.push(`/org/course/${response.data.id}`)
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to create course"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to create course", {
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
      console.error("Error creating course:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to create course. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to create course", {
        description: errorMessage,
      })
    },
  })

  // Handle image file selection and upload
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
    if (!validImageTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please select an image file (JPEG, PNG, WebP, GIF, or SVG).",
      })
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error("File too large", {
        description: "Image size must be less than 10MB.",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload image
    setIsUploadingImage(true)
    try {
      const response = await uploadImage(file)
      if (response.data) {
        form.setValue("thumbnail", response.data.url)
        toast.success("Image uploaded successfully", {
          description: "Your thumbnail image has been uploaded.",
        })
      } else {
        const errorMsg = response.error?.message || "Failed to upload image"
        toast.error("Upload failed", {
          description: errorMsg,
        })
        setThumbnailPreview(null)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Upload failed", {
        description: "An unexpected error occurred while uploading the image.",
      })
      setThumbnailPreview(null)
    } finally {
      setIsUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Handle remove image
  const handleRemoveImage = () => {
    form.setValue("thumbnail", "")
    setThumbnailPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Update preview when thumbnail URL changes (e.g., from form reset)
  useEffect(() => {
    if (thumbnailValue && thumbnailValue.startsWith("http")) {
      setThumbnailPreview(thumbnailValue)
    } else if (!thumbnailValue) {
      setThumbnailPreview(null)
    }
  }, [thumbnailValue])

  const onSubmit = (values: FormCourseValues) => {
    if (!organizationId) {
      form.setError("root", {
        message: "Organization ID is required. Please ensure you are logged in and a member of an organization.",
      })
      return
    }

    if (freeCourseLimitReached) {
      form.setError("root", {
        message: "Free plan limit reached: you can only create up to 2 courses. Upgrade your plan to create more.",
      })
      toast.error("Free plan limit reached", {
        description: "Upgrade your plan to create more than 2 courses.",
      })
      return
    }

    // Clean up thumbnail - convert empty string to undefined
    const submitData: z.infer<typeof CreateCourseSchema> = {
      ...values,
      organizationId, // Add organizationId from session
      thumbnail: values.thumbnail === "" ? undefined : values.thumbnail,
    }
    
    createCourseMutation.mutate(submitData)
  }


  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6 bg-white">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-primary">Create Course</h1>
          <p className="text-black">Create a new course for your organization</p>
        </div>

        <Card className="border-primary/20 bg-white">
          <CardHeader>
            <CardTitle className="text-primary">Course Details</CardTitle>
            <CardDescription>Provide basic information about your course</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-6"
              >
                {form.formState.errors.root && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                {freeCourseLimitReached && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive flex items-center justify-between gap-3">
                    <span>
                      Free plan limit reached: you already have {existingCoursesCount} course{existingCoursesCount !== 1 ? "s" : ""}. Upgrade to create more.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/5"
                      onClick={() => router.push("/settings/subscription")}
                    >
                      Upgrade
                    </Button>
                  </div>
                )}
                
                {/* Show all form errors for debugging */}
                {Object.keys(form.formState.errors).length > 0 && form.formState.errors.root === undefined && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    Please fix the form errors below
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">Course Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter course title" {...field} className="border-primary/30 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your course..." rows={4} {...field} className="border-primary/30 focus:border-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">Course Deadline (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value ? new Date(value) : undefined)
                          }}
                          className="border-primary/30 focus:border-primary"
                        />
                      </FormControl>
                      <FormDescription>
                        After this date/time, learners will no longer be able to take this course.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary">Course Thumbnail</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {/* Image Preview */}
                          {thumbnailPreview && (
                            <div className="relative inline-block">
                              <div className="relative w-full max-w-xs h-48 border-2 border-primary/20 rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={thumbnailPreview}
                                  alt="Course thumbnail preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleRemoveImage}
                                  className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-white"
                                  aria-label="Remove image"
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Upload Button */}
                          {!thumbnailPreview && (
                            <div className="flex flex-col items-center justify-center w-full">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
                                onChange={handleImageSelect}
                                className="hidden"
                                id="thumbnail-upload"
                                disabled={isUploadingImage}
                              />
                              <label
                                htmlFor="thumbnail-upload"
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                  isUploadingImage
                                    ? "border-muted-foreground/50 bg-muted/50 cursor-not-allowed"
                                    : "border-primary/30 hover:border-primary hover:bg-primary/5"
                                }`}
                              >
                                {isUploadingImage ? (
                                  <>
                                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-8 h-8 text-primary mb-2" />
                                    <p className="text-sm text-primary font-medium">
                                      Click to upload thumbnail
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      PNG, JPG, WebP, GIF or SVG (max 10MB)
                                    </p>
                                  </>
                                )}
                              </label>
                            </div>
                          )}

                          {/* Hidden input for form value */}
                          <input type="hidden" {...field} />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Optional: Upload a thumbnail image for your course. Supported formats: JPEG, PNG, WebP, GIF, SVG (max 10MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-primary">Publish Course</FormLabel>
                          <FormDescription>Make the course visible to students</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === "published"}
                            onCheckedChange={(checked) =>
                              field.onChange(checked ? "published" : "draft")
                            }
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    disabled={createCourseMutation.isPending || freeCourseLimitReached}
                  >
                    {createCourseMutation.isPending ? "Creating..." : "Create Course"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 border-primary/30 text-primary hover:bg-primary/10" asChild>
                    <Link href="/org/course">Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
