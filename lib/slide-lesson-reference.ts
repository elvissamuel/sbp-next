import { extractPlainTextFromLexicalEditorState } from "@/lib/lexical-plain-text"

type SlideLike = {
  order?: number
  title?: string
  aiImagePrompt?: string
  content?: { editorState?: string }
  media?: { type?: string; url?: string }
}

/**
 * Builds a plain-text block from a lesson's slides JSON for AI (e.g. quiz generation).
 * Includes slide titles, body text (Lexical), and saved AI image prompts (nano-banana / Replicate).
 */
export function buildReferenceTextFromLessonSlidesJson(slidesJson: unknown): string | null {
  if (!slidesJson || typeof slidesJson !== "object") return null
  const wrapper = slidesJson as { slides?: unknown }
  if (!Array.isArray(wrapper.slides) || wrapper.slides.length === 0) return null

  const sorted = [...wrapper.slides].sort((a, b) => {
    const ao = typeof (a as SlideLike).order === "number" ? (a as SlideLike).order! : 0
    const bo = typeof (b as SlideLike).order === "number" ? (b as SlideLike).order! : 0
    return ao - bo
  })

  const blocks: string[] = []
  sorted.forEach((raw, index) => {
    const slide = raw as SlideLike
    const lines: string[] = []
    const title = typeof slide.title === "string" ? slide.title.trim() : ""
    lines.push(`Slide ${index + 1}${title ? `: ${title}` : ""}`)

    const lexical = slide.content?.editorState
      ? extractPlainTextFromLexicalEditorState(slide.content.editorState)
      : ""
    if (lexical) {
      lines.push(`Body: ${lexical}`)
    }

    const aiPrompt = typeof slide.aiImagePrompt === "string" ? slide.aiImagePrompt.trim() : ""
    if (aiPrompt) {
      lines.push(`AI image prompt (what the slide picture should teach): ${aiPrompt}`)
    }

    blocks.push(lines.join("\n"))
  })

  const out = blocks.join("\n\n").trim()
  return out.length > 0 ? out : null
}
