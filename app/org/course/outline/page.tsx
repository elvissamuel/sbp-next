"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { previewCourseOutline, saveCourseOutline, type CourseOutline } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"

export default function CourseOutlinePage() {
  const router = useRouter()
  const organizationId = getPrimaryOrganization()?.id || ""
  const [mode, setMode] = useState<"document" | "topic">("document")
  const [text, setText] = useState("")
  const [topic, setTopic] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [outline, setOutline] = useState<CourseOutline | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: "title" | "content", value: string) => {
    setOutline((current) => {
      if (!current) return current
      const modules = current.modules.map((module, index) => {
        if (index !== moduleIndex) return module
        return {
          ...module,
          lessons: module.lessons.map((lesson, lessonPos) =>
            lessonPos === lessonIndex ? { ...lesson, [field]: value } : lesson,
          ),
        }
      })
      return { ...current, modules }
    })
  }

  const handlePreview = async () => {
    setIsPreviewing(true)
    try {
      const response = await previewCourseOutline({
        mode,
        text: mode === "document" ? text : undefined,
        topic: mode === "topic" ? topic : undefined,
        file: mode === "document" ? file || undefined : undefined,
      })
      if (response.data) {
        setOutline(response.data)
        toast.success("Outline ready. Edit it, then save the course.")
      } else {
        toast.error(response.error?.message || "Could not build the outline")
      }
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleSave = async () => {
    if (!outline || !organizationId) return
    setIsSaving(true)
    try {
      const response = await saveCourseOutline({ ...outline, organizationId })
      if (response.data) {
        toast.success("Course created with draft lessons")
        router.push(`/org/course/${response.data.id}`)
      } else {
        toast.error(response.error?.message || "Could not save the course")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <AppBreadcrumbs />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Build from an outline</h1>
          <p className="text-muted-foreground">
            Preview the course, modules, and lessons, then save them together as drafts.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>
              A document is grouped by its Module and Lesson titles. Each lesson runs until the next lesson. A topic creates a short draft you can edit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={mode === "document" ? "default" : "outline"} onClick={() => setMode("document")}>
                Document
              </Button>
              <Button type="button" variant={mode === "topic" ? "default" : "outline"} onClick={() => setMode("topic")}>
                Topic
              </Button>
            </div>
            {mode === "document" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="outline-file">PDF</Label>
                  <Input
                    id="outline-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outline-text">Or paste text</Label>
                  <Textarea
                    id="outline-text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={8}
                    placeholder="Paste the document if you are not uploading a PDF"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="outline-topic">Topic</Label>
                <Input
                  id="outline-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Workplace safety for new staff"
                />
              </div>
            )}
            <Button type="button" onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Preview outline
            </Button>
          </CardContent>
        </Card>

        {outline ? (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Each lesson is the extracted text from its title until the next lesson. Edit anything before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="course-title">Course title</Label>
                <Input
                  id="course-title"
                  value={outline.title}
                  onChange={(event) => setOutline({ ...outline, title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  value={outline.description}
                  onChange={(event) => setOutline({ ...outline, description: event.target.value })}
                  rows={3}
                />
              </div>
              {outline.modules.map((module, moduleIndex) => (
                <div key={`${module.title}-${moduleIndex}`} className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>Module {moduleIndex + 1}</Label>
                    <Input
                      value={module.title}
                      onChange={(event) => {
                        const modules = outline.modules.map((entry, index) =>
                          index === moduleIndex ? { ...entry, title: event.target.value } : entry,
                        )
                        setOutline({ ...outline, modules })
                      }}
                    />
                  </div>
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={`${lesson.title}-${lessonIndex}`} className="space-y-2 rounded-md bg-muted/40 p-3">
                      <Label>Lesson {lessonIndex + 1}</Label>
                      <Input
                        value={lesson.title}
                        onChange={(event) => updateLesson(moduleIndex, lessonIndex, "title", event.target.value)}
                      />
                      <Textarea
                        value={lesson.content}
                        onChange={(event) => updateLesson(moduleIndex, lessonIndex, "content", event.target.value)}
                        rows={6}
                      />
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="button" onClick={handleSave} disabled={isSaving || !organizationId}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save course
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/org/course/create">Use the form instead</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
