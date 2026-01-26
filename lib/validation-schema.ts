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

export const CreateLessonSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  videoUrl: z.string().optional(), // Optional video URL
  resourceIds: z.array(z.string()).optional(), // Optional array of resource IDs to reference
})

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
})