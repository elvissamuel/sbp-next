/**
 * Best-effort plain text from a Lexical editorState JSON string (no Lexical runtime).
 */
export function extractPlainTextFromLexicalEditorState(editorStateJson: string): string {
  if (!editorStateJson?.trim()) return ""
  try {
    const parsed = JSON.parse(editorStateJson) as { root?: unknown }
    const root = parsed.root ?? parsed
    const raw = extractTextFromLexicalNode(root)
    return raw.replace(/\s+/g, " ").trim()
  } catch {
    return ""
  }
}

function extractTextFromLexicalNode(node: unknown): string {
  if (node === null || node === undefined) return ""
  if (typeof node !== "object") return ""
  const obj = node as Record<string, unknown>
  if (typeof obj.text === "string") {
    return obj.text
  }
  const parts: string[] = []
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) {
      const t = extractTextFromLexicalNode(child)
      if (t) parts.push(t)
    }
  }
  return parts.join(" ")
}
