import type { CourseModule, Lesson, Quiz } from "@/lib/api-calls"

export type SequenceItem = {
  id: string
  type: "lesson" | "quiz"
  title: string
  completed: boolean
  duration: number | null
  moduleId?: string
  moduleTitle?: string
  lessonNumber?: number
}

export function buildCourseSequence(input: {
  modules?: CourseModule[]
  lessons: Lesson[]
  quizzes: Quiz[]
  completedLessonIds?: string[]
  isQuizCompleted: (quizId: string) => boolean
}) {
  const completed = new Set(input.completedLessonIds || [])
  const modules = input.modules
    ? input.modules.map((module) => ({
        id: module.id,
        title: module.title,
        lessons: [...(module.lessons || [])].sort((a, b) => a.order - b.order),
      }))
    : [{ id: "lessons", title: "Lessons", lessons: [...input.lessons].sort((a, b) => a.order - b.order) }]

  const quizzesAfterLesson = new Map<string, Quiz[]>()
  const trailingQuizzes: Quiz[] = []
  const sortedQuizzes = [...input.quizzes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  for (const quiz of sortedQuizzes) {
    if (quiz.afterLessonId) {
      const placed = quizzesAfterLesson.get(quiz.afterLessonId) || []
      placed.push(quiz)
      quizzesAfterLesson.set(quiz.afterLessonId, placed)
    } else {
      trailingQuizzes.push(quiz)
    }
  }

  const quizItem = (quiz: Quiz, module?: { id: string; title: string }): SequenceItem => ({
    id: quiz.id,
    type: "quiz",
    title: quiz.title,
    completed: input.isQuizCompleted(quiz.id),
    duration: null,
    moduleId: module?.id,
    moduleTitle: module?.title,
  })

  const items: SequenceItem[] = []
  for (const module of modules) {
    module.lessons.forEach((lesson, index) => {
      items.push({
        id: lesson.id,
        type: "lesson",
        title: lesson.title,
        completed: completed.has(lesson.id),
        duration: lesson.duration ?? null,
        moduleId: module.id,
        moduleTitle: module.title,
        lessonNumber: index + 1,
      })
      const placed = quizzesAfterLesson.get(lesson.id) || []
      placed.forEach((quiz) => items.push(quizItem(quiz, module)))
      quizzesAfterLesson.delete(lesson.id)
    })
  }
  for (const leftover of quizzesAfterLesson.values()) {
    leftover.forEach((quiz) => trailingQuizzes.push(quiz))
  }
  trailingQuizzes.forEach((quiz) => items.push(quizItem(quiz)))
  return { modules, items }
}
