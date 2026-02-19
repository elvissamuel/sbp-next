"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { updateLesson, getLesson, type Lesson } from "@/lib/api-calls"
import { toast } from "sonner"
import { MarkdownEditor } from "@/components/markdown-editor"

const EditLessonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
})

type EditLessonFormValues = z.infer<typeof EditLessonSchema>

interface EditLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string
  courseId: string
}

export function EditLessonDialog({ open, onOpenChange, lessonId, courseId }: EditLessonDialogProps) {
  const queryClient = useQueryClient()
  const [isLoadingLesson, setIsLoadingLesson] = useState(false)

  const form = useForm<EditLessonFormValues>({
    resolver: zodResolver(EditLessonSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  })

  // Fetch lesson data when dialog opens
  useEffect(() => {
    if (open && lessonId) {
      setIsLoadingLesson(true)
      getLesson(lessonId)
        .then((response) => {
          if (response.data) {
            form.reset({
              title: response.data.title,
              content: response.data.content,
            })
          } else if (response.error) {
            const errorMsg =
              typeof response.error === "string"
                ? response.error
                : response.error?.message || "Failed to load lesson"
            toast.error("Failed to load lesson", {
              description: errorMsg,
            })
            onOpenChange(false)
          }
        })
        .catch((error: any) => {
          console.error("Error loading lesson:", error)
          toast.error("Failed to load lesson", {
            description: error?.message || "An unexpected error occurred",
          })
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingLesson(false)
        })
    }
  }, [open, lessonId, form, onOpenChange])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  const updateLessonMutation = useMutation({
    mutationFn: (data: EditLessonFormValues) => updateLesson(lessonId, data),
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Lesson updated successfully", {
          description: `The lesson "${response.data.title}" has been updated.`,
        })
        queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
        queryClient.invalidateQueries({ queryKey: ["course", courseId] })
        onOpenChange(false)
      } else if (response.error) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "Failed to update lesson"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to update lesson", {
          description: errorMsg,
        })
      } else if (response.validationErrors) {
        response.validationErrors.forEach((error) => {
          form.setError(error.field as any, {
            message: error.message,
          })
        })
        const firstError = response.validationErrors[0]
        toast.error("Validation error", {
          description: firstError.message || "Please check the form for errors.",
        })
      }
    },
    onError: (error: any) => {
      console.error("Error updating lesson:", error)
      const errorMessage = typeof error?.message === "string" ? error.message : "Failed to update lesson. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to update lesson", {
        description: errorMessage,
      })
    },
  })

  const onSubmit = (values: EditLessonFormValues) => {
    updateLessonMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#65B32E]/20 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#65B32E]">Edit Lesson</DialogTitle>
          <DialogDescription>Update lesson title and content</DialogDescription>
        </DialogHeader>

        {isLoadingLesson ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#65B32E]">
                Lesson Title *
              </Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Enter lesson title"
                disabled={updateLessonMutation.isPending}
                className="border-[#65B32E]/30 focus:border-[#65B32E]"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-[#DE1915]">{form.formState.errors.title.message}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-[#65B32E]">
                Lesson Content *
              </Label>
              <MarkdownEditor
                value={form.watch("content") || ""}
                onChange={(value) => form.setValue("content", value)}
                placeholder="Enter lesson content... (Markdown supported)"
                rows={15}
                disabled={updateLessonMutation.isPending}
              />
              {form.formState.errors.content && (
                <p className="text-sm text-[#DE1915]">{form.formState.errors.content.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Supports Markdown formatting. Use the Preview tab to see how it will look.</p>
            </div>

            {/* Error Display */}
            {form.formState.errors.root && (
              <div className="p-3 bg-[#DE1915]/10 border border-[#DE1915]/20 rounded-md">
                <p className="text-sm text-[#DE1915]">{form.formState.errors.root.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateLessonMutation.isPending}
                className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateLessonMutation.isPending || !form.watch("title") || !form.watch("content")}
                className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
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
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

