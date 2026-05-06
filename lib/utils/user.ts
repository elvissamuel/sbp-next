/**
 * User utility functions
 */

/**
 * Prefer stored first/last; if both are empty, split legacy `name` (e.g. "Jane Doe")
 * for forms and profile APIs.
 */
export function resolveFirstLastForProfile(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  displayName: string | null | undefined
): { firstName: string; lastName: string } {
  const f = (firstName ?? "").trim()
  const l = (lastName ?? "").trim()
  if (f || l) {
    return { firstName: f, lastName: l }
  }
  const n = (displayName ?? "").trim()
  if (!n) {
    return { firstName: "", lastName: "" }
  }
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: "", lastName: "" }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

/**
 * Gets the full name from firstName and lastName
 * Falls back to provided name if firstName/lastName are not available
 */
export function getUserFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallbackName?: string | null
): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim()
  }
  if (firstName) {
    return firstName
  }
  if (lastName) {
    return lastName
  }
  return fallbackName || "N/A"
}

/**
 * Gets user initials from firstName and lastName
 * Falls back to email or provided name
 */
export function getUserInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null,
  fallbackName?: string | null
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName[0].toUpperCase()
  }
  if (lastName) {
    return lastName[0].toUpperCase()
  }
  if (fallbackName) {
    const parts = fallbackName.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return fallbackName[0].toUpperCase()
  }
  if (email) {
    return email[0].toUpperCase()
  }
  return "U"
}


