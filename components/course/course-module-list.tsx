"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Edit, FileText, MoreHorizontal, Plus, Trash2, ChevronDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CourseModule, Lesson } from "@/lib/api-calls"

type CourseModuleListProps = {
  courseId: string
  modules: CourseModule[]
  onEditLesson: (lessonId: string) => void
  onDeleteLesson: (lesson: { id: string; title: string }) => void
  onLessonStatusChange: (lessonId: string, status: string, title: string) => void
  onDeleteModule: (module: CourseModule) => void
}

export function CourseModuleList({
  courseId,
  modules,
  onEditLesson,
  onDeleteLesson,
  onLessonStatusChange,
  onDeleteModule,
}: CourseModuleListProps) {
  if (modules.length === 0) {
    return (
      <p className="text-muted-foreground">
        No modules yet. Add a module, then create lessons inside it.
      </p>
    )
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {modules.map((module) => {
        const lessons = module.lessons || []
        return (
          <AccordionItem key={module.id} value={module.id} className="rounded-lg border border-border/50 px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                <span className="font-medium">{module.title}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {module.description ? (
                <p className="mb-3 text-sm text-muted-foreground">{module.description}</p>
              ) : null}
              <div className="mb-3 flex justify-end gap-2">
                <Button size="sm" asChild>
                  <Link href={`/org/course/${courseId}/lesson/create?moduleId=${module.id}`}>
                    <Plus size={14} className="mr-2" />
                    Add lesson
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDeleteModule(module)}>
                  <Trash2 size={14} className="mr-2" />
                  Delete module
                </Button>
              </div>
              {lessons.length === 0 ? (
                <p className="pb-2 text-sm text-muted-foreground">No lessons in this module yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-8">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map((lesson: Lesson) => (
                      <TableRow key={lesson.id} className="border-border/40">
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <FileText size={14} />
                            Lesson
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{lesson.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={lesson.status === "published" ? "default" : "outline"}>
                              {lesson.status === "published" ? "Published" : "Draft"}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <ChevronDown size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {lesson.status !== "draft" && (
                                  <DropdownMenuItem
                                    onClick={() => onLessonStatusChange(lesson.id, "draft", lesson.title)}
                                  >
                                    Move to Draft
                                  </DropdownMenuItem>
                                )}
                                {lesson.status !== "published" && (
                                  <DropdownMenuItem
                                    onClick={() => onLessonStatusChange(lesson.id, "published", lesson.title)}
                                  >
                                    Publish
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(lesson.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-secondary/10">
                                <MoreHorizontal size={16} className="text-secondary" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border-secondary/20">
                              <DropdownMenuItem
                                onClick={() => onEditLesson(lesson.id)}
                                className="hover:bg-secondary/10 text-secondary"
                              >
                                <Edit size={16} className="mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDeleteLesson({ id: lesson.id, title: lesson.title })}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
