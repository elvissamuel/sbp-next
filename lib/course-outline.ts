import { generateText } from "ai"
import { z } from "zod"
import { geminiModel } from "@/lib/ai"

const MODEL_CHAR_LIMIT = 100_000

const headingOutlineSchema = z.object({
  title: z.string().min(1),
  modules: z
    .array(
      z.object({
        title: z.string().min(1),
        lessons: z.array(z.object({ heading: z.string().min(1) })).min(1),
      }),
    )
    .min(1),
})

const topicOutlineSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  modules: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        lessons: z
          .array(
            z.object({
              title: z.string().min(1),
              content: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
})

export type CourseOutline = {
  title: string
  description: string
  modules: Array<{
    title: string
    description?: string
    lessons: Array<{ title: string; content: string }>
  }>
}

function parseJsonObject(raw: string): unknown {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) cleaned = match[0]
  return JSON.parse(cleaned)
}

function firstParagraph(source: string): string {
  const paragraph = source
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part.length > 40)
  return (paragraph || source.trim()).slice(0, 500)
}

function locateHeading(source: string, heading: string, from: number): number {
  const needle = heading.trim()
  if (needle.length < 3) return -1
  const exact = source.indexOf(needle, from)
  if (exact >= 0) return exact
  return source.toLowerCase().indexOf(needle.toLowerCase(), from)
}

function sliceDocument(source: string, outline: z.infer<typeof headingOutlineSchema>): CourseOutline {
  const located: Array<{ moduleTitle: string; lessonTitle: string; index: number; headingLength: number }> = []
  let cursor = 0

  for (const module of outline.modules) {
    for (const lesson of module.lessons) {
      const index = locateHeading(source, lesson.heading, cursor)
      if (index < 0) continue
      located.push({
        moduleTitle: module.title.trim(),
        lessonTitle: lesson.heading.trim(),
        index,
        headingLength: lesson.heading.trim().length,
      })
      cursor = index + lesson.heading.trim().length
    }
  }

  if (located.length === 0) {
    return {
      title: outline.title.trim(),
      description: firstParagraph(source),
      modules: [
        {
          title: "Module 1",
          lessons: [{ title: outline.title.trim() || "Lesson 1", content: source.trim() }],
        },
      ],
    }
  }

  const modules: CourseOutline["modules"] = []
  const prefix = source.slice(0, located[0].index).trim()
  if (prefix) {
    modules.push({
      title: outline.modules[0]?.title?.trim() || "Module 1",
      lessons: [{ title: outline.title.trim() || "Introduction", content: prefix }],
    })
  }

  for (let i = 0; i < located.length; i++) {
    const current = located[i]
    const next = located[i + 1]
    const bodyStart = current.index + current.headingLength
    const content = source.slice(bodyStart, next ? next.index : source.length).trim()
    let module = modules.find((entry) => entry.title === current.moduleTitle)
    if (!module) {
      module = { title: current.moduleTitle, lessons: [] }
      modules.push(module)
    }
    module.lessons.push({
      title: current.lessonTitle,
      content,
    })
  }

  return {
    title: outline.title.trim(),
    description: firstParagraph(source),
    modules: modules.filter((module) => module.lessons.length > 0),
  }
}

export async function structureDocumentOutline(sourceText: string): Promise<CourseOutline> {
  const source = sourceText.trim()
  if (!source) {
    throw new Error("The document has no text to structure")
  }

  const head = source.slice(0, MODEL_CHAR_LIMIT)
  const tail = source.slice(MODEL_CHAR_LIMIT).trim()

  const { text } = await generateText({
    model: geminiModel,
    prompt: `Split the document below into a course outline. Do not rewrite, summarize, or paraphrase any of it.

Return ONLY JSON with this shape:
{
  "title": "a short course title",
  "modules": [
    {
      "title": "module name",
      "lessons": [
        { "heading": "exact heading or opening line copied from the document" }
      ]
    }
  ]
}

Rules:
- Do not include lesson body text. Bodies are cut from the document using the headings you return.
- Each heading must appear verbatim in the document, in order, with the same capitalization when possible.
- Use the document's own headings. If it has none, set heading to the first 8-12 words of each section, copied exactly.
- Keep the original order. Use 1-8 modules and 1-12 lessons per module.
- Do not invent sections that are not in the document.

Document:
${head}`,
  })

  const parsed = headingOutlineSchema.parse(parseJsonObject(text))
  const outline = sliceDocument(head, parsed)

  if (tail) {
    const last = outline.modules[outline.modules.length - 1]
    const remainder = { title: "Remaining document", content: tail }
    if (last) last.lessons.push(remainder)
    else outline.modules.push({ title: "Continued", lessons: [remainder] })
  }

  return outline
}

export async function structureTopicOutline(topic: string, level = "beginner"): Promise<CourseOutline> {
  const { text } = await generateText({
    model: geminiModel,
    prompt: `Create a course outline for this topic. This is a draft structure, not a full lesson.

Topic: ${topic}
Level: ${level}

Return ONLY JSON:
{
  "title": "course title",
  "description": "one or two sentences",
  "modules": [
    {
      "title": "module title",
      "description": "one sentence",
      "lessons": [
        { "title": "lesson title", "content": "one short paragraph of draft notes" }
      ]
    }
  ]
}

Use 2-4 modules and 2-4 lessons in each. Keep each lesson content to one short paragraph.`,
  })

  const parsed = topicOutlineSchema.parse(parseJsonObject(text))
  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    modules: parsed.modules.map((module) => ({
      title: module.title.trim(),
      description: module.description?.trim(),
      lessons: module.lessons.map((lesson) => ({
        title: lesson.title.trim(),
        content: (lesson.content || "").trim(),
      })),
    })),
  }
}

export function plainTextToLessonHtml(value: string): string {
  const text = value.trim()
  if (!text) return "<p></p>"
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
