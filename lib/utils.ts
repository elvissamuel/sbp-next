import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function calculateProgress(completedLessons: number, totalLessons: number): number {
  if (totalLessons === 0) return 0
  return Math.round((completedLessons / totalLessons) * 100)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function formatCurrency(amount: number, currency = "NGN"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  })
  return formatter.format(amount)
}
