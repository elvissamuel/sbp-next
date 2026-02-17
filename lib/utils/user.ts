/**
 * User utility functions
 */

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


