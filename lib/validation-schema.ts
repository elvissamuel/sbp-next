import { z } from "zod";

export const testimonyFormSchema = z.object({
  first_name: z.string(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  // phoneCountry: z.string(),
  phone_number: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  testimony: z.string(),
})

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const CreateCourseSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["draft", "published", "archived"]),
  thumbnail: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url("Invalid thumbnail URL").optional()
  ),
})

export const CreateResourceSchema = z
  .object({
    courseId: z.string().min(1, "Course is required"),
    title: z.string().min(1, "Title is required"),
    inputType: z.enum(["file", "text"]),
    content: z.string().optional(),
  })
  .refine(
    (data) => {
      // Content is required when inputType is "text"
      if (data.inputType === "text" && (!data.content || data.content.trim().length === 0)) {
        return false
      }
      return true
    },
    {
      message: "Content is required when using text input",
      path: ["content"],
    }
  )

// Slide structure validation
const SlideSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
  title: z.string().optional(),
  /** Saved when generating an image with AI — used for quiz generation from slide lessons */
  aiImagePrompt: z.string().optional(),
  content: z.object({
    type: z.literal("lexical"),
    editorState: z.string(), // Lexical JSON state as string
  }),
  media: z.object({
    type: z.enum(["image", "video", "none"]),
    url: z.string().url().optional(),
    thumbnail: z.string().url().optional(), // For videos
  }),
  layout: z.enum(["text-media", "media-text", "text-only", "media-only", "split", "split-reverse"]),
})

// Slides array validation
const SlidesSchema = z.object({
  slides: z.array(SlideSchema).min(1, "At least one slide is required"),
})

export const CreateLessonSchema = z
  .object({
    courseId: z.string().min(1, "Course ID is required"),
    title: z.string().min(1, "Title is required"),
    content: z.string().optional(), // Optional if slides are provided
    slides: SlidesSchema.optional(), // Optional slides structure
    videoUrl: z.string().optional(), // Optional video URL
    status: z.enum(["draft", "published"]).optional(), // Optional status
    resourceIds: z.array(z.string()).optional(), // Optional array of resource IDs to reference
  })
  .refine(
    (data) => {
      // Either content or slides must be provided
      const hasContent = data.content && data.content.trim().length > 0
      const hasSlides = data.slides && data.slides.slides && data.slides.slides.length > 0
      return hasContent || hasSlides
    },
    {
      message: "Either content or slides must be provided",
      path: ["content"],
    }
  )

export const CreateQuizSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  quizType: z.enum(["multiple_choice", "true_false", "short_answer"]).optional(),
  numQuestions: z.number().int().min(1).max(50).default(5),
  resourceIds: z.array(z.string()).optional(), // Optional array of resource IDs to reference
  lessonIds: z.array(z.string()).optional(), // Optional array of lesson IDs to reference
})

export const InviteMemberSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "instructor"]).default("member"),
  requesterUserId: z.string().optional(), // User ID of the person making the invite (for permission checks)
})