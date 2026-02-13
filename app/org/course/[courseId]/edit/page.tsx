"use client"

import React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCourse, updateCourse, deleteCourse } from "@/lib/api-calls"
import { CreateCourseSchema } from "@/lib/validation-schema"
import { z } from "zod"
import { toast } from "sonner"
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
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditCoursePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const courseId = params.courseId as string

  // Create a form schema without organizationId for the form
  const FormCourseSchema = CreateCourseSchema.omit({ organizationId: true })
  type FormCourseValues = z.infer<typeof FormCourseSchema>

  // Fetch course data
  const { data: courseResponse, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  })

  const course = courseResponse?.data

  const form = useForm<FormCourseValues>({
    resolver: zodResolver(FormCourseSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      thumbnail: "",
    },
    values: course
      ? {
          title: course.title,
          description: course.description,
          status: course.status as "draft" | "published" | "archived",
          thumbnail: course.thumbnail || "",
        }
      : undefined,
  })

  const updateCourseMutation = useMutation({
    mutationFn: (values: FormCourseValues) =>
      updateCourse(courseId, {
        ...values,
        thumbnail: values.thumbnail === "" ? undefined : values.thumbnail,
      }),
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Course updated successfully", {
          description: `The course "${response.data.title}" has been updated.`,
        })
        queryClient.invalidateQueries({ queryKey: ["course", courseId] })
        queryClient.invalidateQueries({ queryKey: ["courses"] })
        router.push(`/org/course/${courseId}`)
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to update course"
        toast.error("Failed to update course", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error updating course:", error)
      toast.error("Failed to update course", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const deleteCourseMutation = useMutation({
    mutationFn: () => deleteCourse(courseId),
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success("Course deleted successfully")
        queryClient.invalidateQueries({ queryKey: ["courses"] })
        router.push("/org/course")
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to delete course"
        toast.error("Failed to delete course", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error deleting course:", error)
      toast.error("Failed to delete course", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const onSubmit = (values: FormCourseValues) => {
    updateCourseMutation.mutate(values)
  }

  const handleDelete = () => {
    deleteCourseMutation.mutate()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <AppBreadcrumbs />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <AppBreadcrumbs />
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-destructive">Course not found</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href="/org/course">Back to Courses</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
          <p className="text-muted-foreground">Update course information</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>Update basic information about your course</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            onCheckedChange={(checked) => field.onChange(checked ? "published" : "draft")}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={updateCourseMutation.isPending}>
                    {updateCourseMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 bg-transparent" asChild>
                    <Link href={`/org/course/${courseId}`}>Cancel</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Course</CardTitle>
            <CardDescription>This action cannot be undone</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete the course and all associated lessons, quizzes, and student progress.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteCourseMutation.isPending}>
                  {deleteCourseMutation.isPending ? "Deleting..." : "Delete Course"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the course "{course.title}" and all associated data. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


