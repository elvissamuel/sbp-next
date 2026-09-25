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

function findModuleLessonMarkers(source: string) {
  const markers: Array<{ kind: "module" | "lesson"; title: string; index: number; length: number }> = []
  const pattern = /^(module|lesson)\b[^\n]*$/gim
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    markers.push({
      kind: match[1].toLowerCase() === "module" ? "module" : "lesson",
      title: match[0].trim(),
      index: match.index,
      length: match[0].length,
    })
  }
  return markers
}

function structureByModuleLessonLabels(source: string): CourseOutline | null {
  const markers = findModuleLessonMarkers(source)
  if (markers.length === 0) return null

  const prefix = source.slice(0, markers[0].index).trim()
  const titleLine = prefix.split("\n").map((line) => line.trim()).find(Boolean)
  const modules: CourseOutline["modules"] = []
  let current: CourseOutline["modules"][number] | undefined

  const ensureModule = (name: string) => {
    const existing = modules.find((module) => module.title === name)
    if (existing) {
      current = existing
      return existing
    }
    const created = { title: name, lessons: [] as CourseOutline["modules"][number]["lessons"] }
    modules.push(created)
    current = created
    return created
  }

  if (markers[0].kind === "lesson") ensureModule("Module 1")

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]
    const next = markers[i + 1]
    const body = source.slice(marker.index + marker.length, next ? next.index : source.length).trim()

    if (marker.kind === "module") {
      const module = ensureModule(marker.title)
      if (!next || next.kind === "module") {
        if (body) module.lessons.push({ title: marker.title, content: body })
      } else if (body) {
        module.description = body
      }
    } else {
      const module = current ?? ensureModule("Module 1")
      module.lessons.push({ title: marker.title, content: body })
    }
  }

  const grouped = modules.filter((module) => module.lessons.length > 0)
  if (grouped.length === 0) return null

  return {
    title: (titleLine || grouped[0].title).slice(0, 120),
    description: firstParagraph(prefix || source),
    modules: grouped,
  }
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
  const labeled = structureByModuleLessonLabels(head)

  let outline = labeled
  if (!outline) {
    const { text } = await generateText({
      model: geminiModel,
      prompt: `Split the document below into a course outline by its Module and Lesson titles. Do not rewrite, summarize, or paraphrase any of it.

Return ONLY JSON with this shape:
{
  "title": "a short course title",
  "modules": [
    {
      "title": "the exact module title line from the document",
      "lessons": [
        { "heading": "the exact lesson title line from the document" }
      ]
    }
  ]
}

Rules:
- A module is a line that begins with "Module", such as "Module 1", "Module One", or "Module: Safety".
- A lesson is a line that begins with "Lesson", such as "Lesson 1", "Lesson Two", or "Lesson: Hard Hats".
- Copy those title lines verbatim, in the order they appear.
- Put each lesson under the module title that comes before it.
- A lesson includes the text after its title until the next Lesson or Module title. Do not return that body text.
- Do not split on any other heading. Do not invent modules or lessons that are not labeled this way.
- If the document has no Module or Lesson title lines, return one module titled "Module 1" and one lesson whose heading is the first line of the document.

Document:
${head}`,
    })

    const parsed = headingOutlineSchema.parse(parseJsonObject(text))
    outline = sliceDocument(head, parsed)
  }

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
