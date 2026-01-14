import { google } from "@ai-sdk/google"
import { generateText, streamText } from "ai"

// Get API key from environment variable (supports both GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

// Set the API key in the environment if we have GEMINI_API_KEY but not GOOGLE_GENERATIVE_AI_API_KEY
if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
}

if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set")
}

export const geminiModel = google("gemini-2.0-flash")

// Generate lesson content using Gemini
export async function generateLessonContent(
  topic: string, 
  courseLevel: string, 
  referenceContent?: string[],
  courseTitle?: string
): Promise<string> {
  try {
    let prompt = `You are an expert educational content creator. Create comprehensive lesson content for the following topic:\n\n`

    if (courseTitle) {
      prompt += `Course Title: ${courseTitle}\n`
    }
    prompt += `Lesson Title: ${topic}\n\n`

    // Add reference content if provided
    if (referenceContent && referenceContent.length > 0) {
      prompt += `Use the following context to create relevant, engaging, and educational content:\n\n`
      referenceContent.forEach((content, index) => {
        prompt += `Reference ${index + 1}:\n${content}\n\n`
      })
    }

    prompt += `This is a ${courseLevel} level course.\n\n`

    prompt += `Requirements:\n`
    prompt += `- Create structured, easy-to-follow content in Markdown format\n`
    prompt += `- Use proper Markdown syntax: #, ##, ### for headings, **bold**, *italic*, \`code\`, \`\`\`code blocks\`\`\`\n`
    prompt += `- For unordered lists, use a single hyphen (-) followed by a space, NOT asterisks (*). Example: "- Item 1" not "* Item 1"\n`
    prompt += `- For ordered lists, use numbers followed by a period and space: "1. Item 1"\n`
    prompt += `- Do NOT mix asterisks with hyphens in list formatting. Use only hyphens (-) for bullet points\n`
    prompt += `- When using bold text within list items, format as: "- **Term:** Definition" not "* **Term:** Definition"\n`
    prompt += `- Include practical examples where relevant\n`
    prompt += `- Use clear, engaging language\n`
    prompt += `- Ensure content is appropriate for the educational context\n`
    prompt += `- Structure content with headings and paragraphs\n`
    prompt += `- Use bullet points or numbered lists for key concepts\n`
    prompt += `- Add emphasis with **bold** and *italic* where appropriate\n`
    prompt += `- Use moderate spacing between sections - avoid excessive line breaks\n`
    prompt += `- Keep paragraphs concise and well-structured\n`
    prompt += `- Include learning objectives, key concepts, and practical examples\n`

    prompt += `\nGenerate the lesson content in Markdown format now. Start with a main heading and structure the content properly:`

    const { text } = await generateText({
      model: geminiModel,
      prompt,
    })
    return text
  } catch (error) {
    console.error("Error generating lesson content:", error)
    throw error
  }
}

// Generate quiz questions using Gemini
export async function generateQuizQuestions(
  lessonContent: string,
  numQuestions = 5,
): Promise<
  Array<{
    question: string
    options: string[]
    correctAnswer: string
    type: string
  }>
> {
  let rawText = ""
  try {
    const result = await generateText({
      model: geminiModel,
      prompt: `Based on the following lesson content, generate ${numQuestions} multiple choice quiz questions.
      
Lesson Content:
${lessonContent}

IMPORTANT: Return ONLY a valid JSON array. Do NOT include any markdown code blocks, backticks, or any other text before or after the JSON.

Return a valid JSON array with this exact structure:
[
  {
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option",
    "type": "multiple_choice"
  }
]

Return ONLY the JSON array - no markdown, no code blocks, no explanations, no backticks.`,
    })

    rawText = result.text

    // Clean the text to remove markdown code blocks if present
    let cleanedText = rawText.trim()
    
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '')
    cleanedText = cleanedText.replace(/\s*```$/i, '')
    cleanedText = cleanedText.trim()
    
    // Try to extract JSON array if there's any extra text
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      cleanedText = jsonMatch[0]
    }

    return JSON.parse(cleanedText)
  } catch (error) {
    console.error("Error generating quiz questions:", error)
    console.error("Raw AI response:", rawText)
    throw error
  }
}

// Generate lesson summary using Gemini
export async function generateLessonSummary(lessonContent: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: geminiModel,
      prompt: `Create a concise summary of the following lesson content. 
      The summary should highlight the key points and learning outcomes.
      Keep it to 3-5 sentences.
      
Lesson Content:
${lessonContent}`,
    })
    return text
  } catch (error) {
    console.error("Error generating summary:", error)
    throw error
  }
}

// Stream text for real-time generation
export async function streamGenerateContent(prompt: string) {
  try {
    const stream = await streamText({
      model: geminiModel,
      prompt: prompt,
    })
    return stream
  } catch (error) {
    console.error("Error streaming content:", error)
    throw error
  }
}
