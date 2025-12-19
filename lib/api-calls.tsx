import { z } from "zod";
import { IApiError, IApiResponse, IValidationError, SignInResponse } from "./models";
import { testimonyFormSchema, SignInSchema, CreateCourseSchema, CreateLessonSchema, CreateQuizSchema, InviteMemberSchema } from "./validation-schema";
import { User, Course } from "@prisma/client";



async function handleValidationResponse (response: Response) {
  const issues = await response.json() as IValidationError[];
  const data = await response.json() as { error: { code: string; message: string; path: string[] }[] };
  const validationErrors = data.error;

  validationErrors.forEach(error => {
    issues.push({
      rule: error.code,
      message: error.message,
      field: error.path[0],
    });
  });

  return issues;
}

async function handleServerError (response: Response) {
  const data = await response.json() as IApiError;

  return data;
}

async function handleApiCalls<T> (response: Response): Promise<IApiResponse<T>> {
  try {
    if (response.status >= 400 && response.status <= 499) {
      const data = await response.json();
      
      // Handle validation errors
      if (data.error && Array.isArray(data.error)) {
        return { validationErrors: await handleValidationResponse(response) };
      }
      
      // Handle simple error messages (like email exists)
      if (data.error && typeof data.error === 'string') {
        return { 
          error: { 
            message: data.error,
            name: 'ApiError'
          } 
        };
      }
    }

    if (response.status >= 500) {
      return { error: await handleServerError(response) };
    }

    return { data: await response.json() as T };
  } catch (error) {
    console.error("api call error", error);

    return { ...(error ? { error } : {}) } as IApiResponse<T>;
  }
}

// export const addTestimony = async (input: z.infer<typeof testimonyFormSchema>): Promise<IApiResponse<Testimony>> => {
//     return handleApiCalls(await fetch(process.env.NEXT_PUBLIC_BROWSER_URL + "api/testimony", {
//       method: "POST",
//       body: JSON.stringify(input),
//     }));
//   };
  
//   export const getPrograms = async (): Promise<IApiResponse<Program[]>> => {
//     return handleApiCalls(await fetch(process.env.NEXT_PUBLIC_BROWSER_URL + "api/program", { method: "GET" }));
//   };

  export const signIn = async (input: z.infer<typeof SignInSchema>): Promise<IApiResponse<SignInResponse>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  };

  export const createCourse = async (input: z.infer<typeof CreateCourseSchema>): Promise<IApiResponse<Course>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  };

  // Course with relations as returned by the API
  export type CourseWithRelations = Course & {
    enrollments?: Array<{ id: string }>;
    lessons?: unknown[];
  };

  export const getCourses = async (organizationId: string, published?: boolean): Promise<IApiResponse<CourseWithRelations[]>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    const params = new URLSearchParams({ organizationId });
    if (published !== undefined) {
      params.append("published", published.toString());
    }
    return handleApiCalls(await fetch(`${baseUrl}/api/courses?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  // Lesson types
  export type Lesson = {
    id: string;
    courseId: string;
    title: string;
    content: string;
    videoUrl?: string | null;
    order: number;
    duration?: number | null;
    createdAt: Date;
    updatedAt: Date;
  };

  export type CourseResource = {
    id: string;
    courseId: string;
    title: string;
    type: string;
    content?: string | null;
    url?: string | null;
    createdAt: Date;
  };

  export const createLesson = async (input: z.infer<typeof CreateLessonSchema>): Promise<IApiResponse<Lesson>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  };

  export const getCourseResources = async (courseId: string): Promise<IApiResponse<CourseResource[]>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/resources?courseId=${courseId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const generateLessonContent = async (courseId: string, topic: string, resourceIds?: string[]): Promise<IApiResponse<{ content: string }>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/ai/generate-lesson-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, topic, resourceIds }),
    }));
  };

  // Quiz types
  export type Quiz = {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    passingScore: number;
    totalPoints: number;
    createdAt: Date;
    updatedAt: Date;
    questions?: QuizQuestion[];
  };

  export type QuizQuestion = {
    id: string;
    quizId: string;
    question: string;
    type: string;
    options: string;
    correctAnswer: string;
    points: number;
    order: number;
  };

  export const createQuiz = async (input: z.infer<typeof CreateQuizSchema>): Promise<IApiResponse<Quiz>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  };

  export type EnrollmentWithUser = {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    progress: number;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  };

  export type CourseWithStats = CourseWithRelations & {
    lessons: Lesson[];
    quizzes: Quiz[];
    enrollments: EnrollmentWithUser[];
    stats: {
      enrollments: number;
      completionRate: number;
      avgScore: number;
    };
  };

  export const getCourse = async (courseId: string): Promise<IApiResponse<CourseWithStats>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/courses/${courseId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export type CourseBySlug = Course & {
    lessons: Lesson[];
    quizzes: Quiz[];
    enrollment: {
      id: string;
      status: string;
      progress: number;
      completedAt: Date | null;
    } | null;
    stats: {
      totalLessons: number;
      completedLessons: number;
      progress: number;
    };
  };

  export const getCourseBySlug = async (slug: string, userId?: string): Promise<IApiResponse<CourseBySlug>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    const url = userId 
      ? `${baseUrl}/api/courses/slug/${slug}?userId=${userId}`
      : `${baseUrl}/api/courses/slug/${slug}`;
    return handleApiCalls(await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const updateCourse = async (courseId: string, updates: Partial<z.infer<typeof CreateCourseSchema>>): Promise<IApiResponse<Course>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }));
  };

  export const deleteCourse = async (courseId: string): Promise<IApiResponse<{ success: boolean }>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/courses/${courseId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const getLesson = async (lessonId: string): Promise<IApiResponse<Lesson & { course: { id: string; title: string } }>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/lessons/${lessonId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const updateLesson = async (lessonId: string, updates: { title: string; content: string }): Promise<IApiResponse<Lesson>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/lessons/${lessonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }));
  };

  export const deleteLesson = async (lessonId: string): Promise<IApiResponse<{ success: boolean }>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/lessons/${lessonId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const inviteMember = async (input: z.infer<typeof InviteMemberSchema>): Promise<IApiResponse<{ message: string; member: any }>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/organizations/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  };

  export type OrganizationMember = {
    id: string;
    userId: string;
    email: string;
    name: string | null;
    role: string;
    joinedAt: Date;
  };

  export const getOrganizationMembers = async (organizationId: string): Promise<IApiResponse<OrganizationMember[]>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/organizations/${organizationId}/members`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export type Enrollment = {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    progress: number;
    createdAt: Date;
  };

  export const enrollStudent = async (userId: string, courseId: string): Promise<IApiResponse<Enrollment>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId }),
    }));
  };

  export type EnrollmentWithCourse = Enrollment & {
    course: Course & {
      lessons?: Array<{ id: string }>;
    };
  };

  export const getUserEnrollments = async (userId: string): Promise<IApiResponse<EnrollmentWithCourse[]>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/enrollments?userId=${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  // Group types
  export type Group = {
    id: string;
    name: string;
    description?: string | null;
    members: number;
    createdAt: Date;
    updatedAt: Date;
  };

  export const getGroups = async (organizationId: string): Promise<IApiResponse<Group[]>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/groups?organizationId=${organizationId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }));
  };

  export const createGroup = async (data: {
    organizationId: string;
    name: string;
    description?: string;
    memberIds?: string[];
  }): Promise<IApiResponse<Group>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }));
  };

  export type GroupEnrollmentResponse = {
    success: boolean;
    enrolled: number;
    alreadyEnrolled: number;
    totalMembers: number;
    enrollments: Enrollment[];
  };

  export const enrollGroupToCourse = async (groupId: string, courseId: string): Promise<IApiResponse<GroupEnrollmentResponse>> => {
    const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || "";
    return handleApiCalls(await fetch(`${baseUrl}/api/groups/${groupId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    }));
  };