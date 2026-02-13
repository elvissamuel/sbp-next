"use client"

import { usePathname, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { getCourse, getCourseBySlug } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname()
  const params = useParams()

  const currentUser = getCurrentUser()
  const userId = currentUser?.id

  // Get course title if we're on a course-related page
  const courseId = params?.courseId as string | undefined
  const slug = params?.slug as string | undefined
  
  // For org routes
  const { data: courseResponse } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId!),
    enabled: !!courseId && pathname.includes("/org/course/") && !pathname.includes("/create"),
  })

  // For classroom routes
  const { data: classroomCourseResponse } = useQuery({
    queryKey: ["course-by-slug", slug, userId],
    queryFn: () => getCourseBySlug(slug!, userId),
    enabled: !!slug && pathname.includes("/classroom/course/"),
  })

  const course = courseResponse?.data || classroomCourseResponse?.data
  const courseTitle = course?.title || "Course"

  // Parse the pathname and build breadcrumbs
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with Organization
  if (segments.includes("org")) {
    breadcrumbs.push({
      label: "Organization",
      href: "/dashboard",
    })

    // Handle course routes
    if (segments.includes("course")) {
      breadcrumbs.push({
        label: "Courses",
        href: "/org/course",
      })

      // Course detail page
      if (courseId && segments.includes(courseId)) {
        const courseIndex = segments.indexOf(courseId)
        breadcrumbs.push({
          label: courseTitle,
          href: `/org/course/${courseId}`,
        })

        // Lesson routes
        if (segments.includes("lesson")) {
          const lessonIndex = segments.indexOf("lesson")
          if (segments[lessonIndex + 1] === "create") {
            breadcrumbs.push({
              label: "Create Lesson",
            })
          } else if (segments[lessonIndex + 1]) {
            const lessonId = segments[lessonIndex + 1]
            if (segments[lessonIndex + 2] === "edit") {
              breadcrumbs.push({
                label: "Edit Lesson",
              })
            } else {
              breadcrumbs.push({
                label: "Lesson",
                href: `/org/course/${courseId}/lesson/${lessonId}`,
              })
            }
          }
        }

        // Quiz routes
        if (segments.includes("quiz")) {
          const quizIndex = segments.indexOf("quiz")
          if (segments[quizIndex + 1] === "create") {
            breadcrumbs.push({
              label: "Create Quiz",
            })
          } else if (segments[quizIndex + 1]) {
            const quizId = segments[quizIndex + 1]
            breadcrumbs.push({
              label: "Quiz",
              href: `/org/course/${courseId}/quiz/${quizId}`,
            })
          }
        }

        // Stats routes
        if (segments.includes("stats")) {
          breadcrumbs.push({
            label: "Statistics",
            href: `/org/course/${courseId}/stats`,
          })
          if (segments.includes("leaderboard")) {
            breadcrumbs.push({
              label: "Leaderboard",
            })
          }
        }

        // Resource routes within a course
        if (segments.includes("resource")) {
          breadcrumbs.push({
            label: "Resources",
          })
          if (segments.includes("upload")) {
            breadcrumbs.push({
              label: "Upload Resource",
            })
          }
        }
      } else if (segments.includes("create")) {
        // Create course page
        breadcrumbs.push({
          label: "Create Course",
        })
      } else if (segments.includes("resource")) {
        // Resource routes outside of a specific course (general resource management)
        breadcrumbs.push({
          label: "Resources",
          href: "/org/course/resource",
        })
        if (segments.includes("upload")) {
          breadcrumbs.push({
            label: "Upload Resource",
          })
        }
      }
    }

    // Employee routes
    if (segments.includes("employee")) {
      breadcrumbs.push({
        label: "Employees",
      })
    }

    // Groups routes
    if (segments.includes("groups")) {
      breadcrumbs.push({
        label: "Groups",
      })
    }
  }

  // Handle classroom routes
  if (segments.includes("classroom")) {
    breadcrumbs.push({
      label: "Dashboard",
      href: "/dashboard",
    })

    if (segments.includes("course")) {
      breadcrumbs.push({
        label: "My Courses",
        href: "/dashboard",
      })

      // Course view page
      if (slug && segments.includes(slug)) {
        breadcrumbs.push({
          label: courseTitle,
          href: `/classroom/course/${slug}`,
        })

        // Lesson routes
        if (segments.includes("lesson")) {
          const lessonIndex = segments.indexOf("lesson")
          if (segments[lessonIndex + 1]) {
            const lessonId = segments[lessonIndex + 1]
            const lesson = course?.lessons?.find((l: any) => l.id === lessonId)
            const lessonTitle = lesson?.title || "Lesson"
            breadcrumbs.push({
              label: lessonTitle,
              href: `/classroom/course/${slug}/lesson/${lessonId}`,
            })
          }
        }

        // Quiz routes
        if (segments.includes("quiz")) {
          const quizIndex = segments.indexOf("quiz")
          if (segments[quizIndex + 1]) {
            const quizId = segments[quizIndex + 1]
            const quiz = course?.quizzes?.find((q: any) => q.id === quizId)
            const quizTitle = quiz?.title || "Quiz"
            breadcrumbs.push({
              label: quizTitle,
              href: `/classroom/course/${slug}/quiz/${quizId}`,
            })
          }
        }
      }
    }
  }

  return breadcrumbs
}

