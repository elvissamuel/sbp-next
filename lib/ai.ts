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
  referenceContent?: string[]
): Promise<string> {
  try {
    let prompt = `Create educational lesson content for a ${courseLevel} level course on "${topic}". 
      The content should be well-structured, engaging, and suitable for online learning.
      Include learning objectives, key concepts, and practical examples.
      Format the response in markdown.`

    // Add reference content if provided
    if (referenceContent && referenceContent.length > 0) {
      prompt += `\n\nUse the following reference materials to inform and enhance the lesson content:\n\n`
      referenceContent.forEach((content, index) => {
        prompt += `Reference ${index + 1}:\n${content}\n\n`
      })
      prompt += `Please incorporate relevant information from these references while creating the lesson content.`
    }

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
  try {
    const { text } = await generateText({
      model: geminiModel,
      prompt: `Based on the following lesson content, generate ${numQuestions} multiple choice quiz questions.
      
Lesson Content:
${lessonContent}

Return the response as a valid JSON array with this structure:
[
  {
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option",
    "type": "multiple_choice"
  }
]

Return ONLY the JSON array, no other text.`,
    })

    return JSON.parse(text)
  } catch (error) {
    console.error("Error generating quiz questions:", error)
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
