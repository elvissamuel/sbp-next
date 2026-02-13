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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SelectComponent from "react-select"
import { Loader2 } from "lucide-react"
import { createQuiz, getCourseResources, getCourse, type CourseResource, type Lesson } from "@/lib/api-calls"
import { CreateQuizSchema } from "@/lib/validation-schema"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"

type FormValues = z.infer<typeof CreateQuizSchema>

export default function CreateQuizPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  // Fetch course with lessons for selection
  const { data: courseResponse, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  })

  // Fetch course resources for selection
  const { data: resourcesResponse, isLoading: resourcesLoading } = useQuery({
    queryKey: ["course-resources", courseId],
    queryFn: () => getCourseResources(courseId),
    enabled: !!courseId,
  })

  const course = courseResponse?.data
  const lessons = course?.lessons || []
  const resources = resourcesResponse?.data || []

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateQuizSchema),
    defaultValues: {
      courseId,
      title: "",
      description: "",
      status: "draft",
      quizType: "multiple_choice",
      numQuestions: 5,
      resourceIds: [],
      lessonIds: [],
    },
  })

  const selectedResourceIds = form.watch("resourceIds") || []
  const selectedLessonIds = form.watch("lessonIds") || []
  const numQuestions = form.watch("numQuestions") || 5

  // Prepare lesson options for react-select
  const lessonOptions = lessons.map((lesson: Lesson) => ({
    value: lesson.id,
    label: lesson.order !== undefined 
      ? `${lesson.title} (Lesson ${lesson.order + 1})`
      : lesson.title,
  }))

  // Get selected lesson options for react-select
  const selectedLessonOptions = lessonOptions.filter(option => 
    selectedLessonIds.includes(option.value)
  )

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: createQuiz,
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Quiz created successfully", {
          description: `The quiz "${response.data.title}" has been created and is being generated.`,
        })
        router.push(`/org/course/${courseId}`)
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to create quiz"
        form.setError("root", {
          message: errorMsg,
        })
        toast.error("Failed to create quiz", {
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
      console.error("Error creating quiz:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to create quiz. Please try again."
      form.setError("root", {
        message: errorMessage,
      })
      toast.error("Failed to create quiz", {
        description: errorMessage,
      })
    },
  })

  const onSubmit = (values: FormValues) => {
    // Ensure courseId is set
    const submitData = {
      ...values,
      courseId,
      resourceIds: selectedResourceIds.length > 0 ? selectedResourceIds : undefined,
      lessonIds: selectedLessonIds.length > 0 ? selectedLessonIds : undefined,
    }
    createQuizMutation.mutate(submitData)
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Quiz</h1>
          <p className="text-muted-foreground">Generate a quiz using AI for your course</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
            <CardDescription>Provide quiz details and select resources for AI generation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter quiz title"
                  disabled={createQuizMutation.isPending}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter quiz description"
                  rows={3}
                  disabled={createQuizMutation.isPending}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as "draft" | "published")}
                  disabled={createQuizMutation.isPending}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quiz Type */}
              <div className="space-y-2">
                <Label htmlFor="quizType">Quiz Type</Label>
                <Select
                  value={form.watch("quizType")}
                  onValueChange={(value) => form.setValue("quizType", value as "multiple_choice" | "true_false" | "short_answer")}
                  disabled={createQuizMutation.isPending}
                >
                  <SelectTrigger id="quizType">
                    <SelectValue placeholder="Select quiz type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="short_answer">Short Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Number of Questions */}
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  min={1}
                  max={50}
                  {...form.register("numQuestions", { valueAsNumber: true })}
                  disabled={createQuizMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">Between 1 and 50 questions</p>
                {form.formState.errors.numQuestions && (
                  <p className="text-sm text-destructive">{form.formState.errors.numQuestions.message}</p>
                )}
              </div>

              {/* Lesson Selection */}
              <div className="space-y-2">
                <Label>Reference Lessons (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select lessons that AI can reference when generating quiz questions. This takes priority over resources.
                </p>
                {courseLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading lessons...
                  </div>
                ) : lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No lessons available. <Link href={`/org/course/${courseId}/lesson/create`} className="text-primary hover:underline">Create lessons</Link> first.
                  </p>
                ) : (
                  <SelectComponent
                    isMulti
                    options={lessonOptions}
                    value={selectedLessonOptions}
                    onChange={(selected) => {
                      const selectedIds = selected 
                        ? (selected as typeof lessonOptions).map(option => option.value)
                        : []
                      form.setValue("lessonIds", selectedIds)
                    }}
                    placeholder="Select lessons..."
                    isDisabled={createQuizMutation.isPending}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "42px",
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 50,
                      }),
                    }}
                  />
                )}
              </div>

              {/* Resource Selection */}
              <div className="space-y-2">
                <Label>Reference Resources (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select resources that AI can reference when generating quiz questions. Only used if no lessons are selected.
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

              {/* Info Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> The quiz will be automatically generated using AI based on your selected lessons, resources, or course content. 
                  {selectedLessonIds.length > 0 && " Selected lessons will be prioritized."}
                  {numQuestions > 0 && ` It will contain ${numQuestions} question${numQuestions > 1 ? 's' : ''}.`}
                </p>
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
                  disabled={createQuizMutation.isPending}
                >
                  {createQuizMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    "Generate Quiz"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  asChild
                  disabled={createQuizMutation.isPending}
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

