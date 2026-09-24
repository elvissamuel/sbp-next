"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { CreateResourceSchema } from "@/lib/validation-schema"
import { getPrimaryOrganization } from "@/lib/session"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { LessonContentEditor } from "@/components/lesson/lesson-content-editor"

type FormValues = z.infer<typeof CreateResourceSchema>

export default function UploadResourcePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [inputType, setInputType] = useState<"file" | "text">("text")
  const [file, setFile] = useState<File | null>(null)

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateResourceSchema),
    defaultValues: {
      organizationId: organizationId || "",
      title: "",
      inputType: "text",
      content: "",
    },
  })

  useEffect(() => {
    if (organizationId) {
      form.setValue("organizationId", organizationId)
    }
  }, [organizationId, form])

  const uploadResourceMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const formData = new FormData()
      formData.append("title", values.title)
      formData.append("organizationId", organizationId)
      formData.append("inputType", values.inputType)

      if (values.inputType === "file" && file) {
        formData.append("file", file)
      } else if (values.inputType === "text" && values.content) {
        formData.append("content", values.content)
      }

      const response = await fetch("/api/resources", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload resource")
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate courses query to mark it as stale
      queryClient.invalidateQueries({ queryKey: ["organization-resources", organizationId] })
      toast.success("Library updated", {
        description: "The resource was added to your organization library.",
      })
      router.push("/org/course/resource")
    },
    onError: (error: Error) => {
      form.setError("root", {
        message: error.message || "Failed to upload resource. Please try again.",
      })
    },
  })

  const onSubmit = (values: FormValues) => {
    if (!organizationId) {
      const errorMsg = "Organization ID is required. Please ensure you are logged in."
      form.setError("root", {
        message: errorMsg,
      })
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (values.inputType === "file" && !file) {
      const errorMsg = "Please select a file to upload"
      form.setError("root", {
        message: errorMsg,
      })
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (values.inputType === "text") {
      const plainText = (values.content || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
      if (!plainText) {
        const errorMsg = "Content is required when using text input"
        form.setError("content", { message: errorMsg })
        return
      }
    }

    uploadResourceMutation.mutate(values)
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Update Library</h1>
          <p className="text-muted-foreground">Add an organization resource that lesson generation can reference</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Resource Details</CardTitle>
            <CardDescription>Upload a file or paste text. This resource belongs to the organization, not a single course.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {form.formState.errors.root && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Resource title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inputType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Input Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value)
                            setInputType(value as "file" | "text")
                          }}
                          defaultValue={field.value}
                          className="flex space-x-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="file" id="file" />
                            <Label htmlFor="file" className="cursor-pointer">
                              Upload File
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="text" />
                            <Label htmlFor="text" className="cursor-pointer">
                              Paste Text
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {inputType === "file" && (
                  <div className="space-y-2">
                    <Label htmlFor="resource-file">Upload File (PDF or Text)</Label>
                    <Input
                      id="resource-file"
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0]
                        if (selectedFile) {
                          setFile(selectedFile)
                        }
                      }}
                      disabled={uploadResourceMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, TXT, Markdown
                    </p>
                  </div>
                )}

                {inputType === "text" && (
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <LessonContentEditor
                          content={field.value || ""}
                          onContentChange={field.onChange}
                          disabled={uploadResourceMutation.isPending}
                          textOnly
                        />
                        <FormDescription>
                          Write or paste the content you want lesson generation to reference
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={uploadResourceMutation.isPending}
                  >
                    {uploadResourceMutation.isPending ? "Saving..." : "Add to library"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 bg-transparent" asChild>
                    <Link href="/org/course/resource">Cancel</Link>
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

