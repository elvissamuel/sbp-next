export const QUIZ_MAX_ATTEMPTS = 2

export function isQuizProgressComplete(attempts?: Array<{ passed: boolean }> | null) {
  const list = attempts || []
  return list.some((attempt) => attempt.passed) || list.length >= QUIZ_MAX_ATTEMPTS
}
