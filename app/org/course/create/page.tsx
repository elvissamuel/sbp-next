"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createCourse } from "@/lib/api-calls"
import { CreateCourseSchema } from "@/lib/validation-schema"
import { getPrimaryOrganization } from "@/lib/session"
import { z } from "zod"
import { toast } from "sonner"
import { useEffect } from "react"
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

export default function CreateCoursePage() {
  const router = useRouter()
  
  // Get primary organization from session
  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  // Create a form schema without organizationId for the form
  const FormCourseSchema = CreateCourseSchema.omit({ organizationId: true })
  
  type FormCourseValues = z.infer<typeof FormCourseSchema>

  const form = useForm<FormCourseValues>({
    resolver: zodResolver(FormCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      thumbnail: "",
    },
  })

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

  const onSubmit = (values: FormCourseValues) => {
    if (!organizationId) {
      form.setError("root", {
        message: "Organization ID is required. Please ensure you are logged in and a member of an organization.",
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
      <div className="max-w-2xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Course</h1>
          <p className="text-muted-foreground">Create a new course for your organization</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
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
                      <FormLabel>Course Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter course title" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your course..." rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormDescription>Optional: Add a thumbnail image URL for your course</FormDescription>
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
                          <FormLabel>Publish Course</FormLabel>
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
                    className="flex-1"
                    disabled={createCourseMutation.isPending}
                  >
                    {createCourseMutation.isPending ? "Creating..." : "Create Course"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 bg-transparent" asChild>
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
