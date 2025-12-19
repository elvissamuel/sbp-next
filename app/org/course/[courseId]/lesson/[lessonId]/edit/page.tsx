"use client"

import type React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getLesson, updateLesson, deleteLesson } from "@/lib/api-calls"
import { toast } from "sonner"
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

export default function EditLessonPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  })

  // Fetch lesson data
  const { data: lessonResponse, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: !!lessonId,
    onSuccess: (response) => {
      if (response.data) {
        setFormData({
          title: response.data.title,
          content: response.data.content,
        })
      }
    },
  })

  const lesson = lessonResponse?.data

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const updateLessonMutation = useMutation({
    mutationFn: () => updateLesson(lessonId, formData),
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Lesson updated successfully", {
          description: `The lesson "${response.data.title}" has been updated.`,
        })
        queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
        queryClient.invalidateQueries({ queryKey: ["course", courseId] })
        router.push(`/org/course/${courseId}`)
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to update lesson"
        toast.error("Failed to update lesson", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error updating lesson:", error)
      toast.error("Failed to update lesson", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const deleteLessonMutation = useMutation({
    mutationFn: () => deleteLesson(lessonId),
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success("Lesson deleted successfully")
        queryClient.invalidateQueries({ queryKey: ["course", courseId] })
        router.push(`/org/course/${courseId}`)
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to delete lesson"
        toast.error("Failed to delete lesson", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error deleting lesson:", error)
      toast.error("Failed to delete lesson", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateLessonMutation.mutate()
  }

  const handleDelete = () => {
    deleteLessonMutation.mutate()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl space-y-6">
          <AppBreadcrumbs />
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl space-y-6">
          <AppBreadcrumbs />
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-destructive">Lesson not found</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/org/course/${courseId}`}>Back to Course</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit Lesson</h1>
          <p className="text-muted-foreground">Update lesson content and settings</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Lesson Information</CardTitle>
            <CardDescription>Modify lesson details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter lesson title"
                  disabled={updateLessonMutation.isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={12}
                  placeholder="Enter lesson content... (Markdown supported)"
                  disabled={updateLessonMutation.isPending}
                  required
                />
                <p className="text-xs text-muted-foreground">Supports Markdown formatting</p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateLessonMutation.isPending || !formData.title || !formData.content}
                >
                  {updateLessonMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button type="button" variant="outline" className="flex-1 bg-transparent" asChild>
                  <Link href={`/org/course/${courseId}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Lesson</CardTitle>
            <CardDescription>This action cannot be undone</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete the lesson "{lesson.title}" and all associated data. All student progress
              in this lesson will be lost.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteLessonMutation.isPending}>
                  {deleteLessonMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Lesson"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the lesson "{lesson.title}" and all associated data. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
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
