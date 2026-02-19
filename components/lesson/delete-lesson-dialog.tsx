"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteLesson } from "@/lib/api-calls"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface DeleteLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessonId: string
  lessonTitle: string
  courseId: string
}

export function DeleteLessonDialog({ open, onOpenChange, lessonId, lessonTitle, courseId }: DeleteLessonDialogProps) {
  const queryClient = useQueryClient()

  const deleteLessonMutation = useMutation({
    mutationFn: () => deleteLesson(lessonId),
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success("Lesson deleted successfully", {
          description: `The lesson "${lessonTitle}" has been deleted.`,
        })
        queryClient.invalidateQueries({ queryKey: ["course", courseId] })
        onOpenChange(false)
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

  const handleDelete = () => {
    deleteLessonMutation.mutate()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-[#65B32E]/20">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the lesson "{lessonTitle}"? This will permanently delete the lesson and all
            associated data. All student progress in this lesson will be lost. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            disabled={deleteLessonMutation.isPending}
            className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteLessonMutation.isPending}
            className="bg-[#DE1915] text-white hover:bg-[#DE1915]/90"
          >
            {deleteLessonMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

