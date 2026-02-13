/**
 * Session utility for managing user session data
 * In production, this should use secure session management (cookies, JWT, etc.)
 */

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
    joinedAt: string; // ISO string for JSON serialization
  }>;
}

/**
 * Get the current user session from localStorage
 */
export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    const sessionData = localStorage.getItem("session");
    if (!sessionData) return null;

    return JSON.parse(sessionData) as UserSession;
  } catch (error) {
    console.error("Error parsing session data:", error);
    return null;
  }
}

/**
 * Set the user session in localStorage
 */
export function setSession(session: UserSession): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("session", JSON.stringify(session));
  } catch (error) {
    console.error("Error setting session data:", error);
  }
}

/**
 * Clear the user session
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("session");
  localStorage.removeItem("user"); // Also clear legacy user storage
}

/**
 * Get the current user
 */
export function getCurrentUser(): UserSession["user"] | null {
  const session = getSession();
  return session?.user || null;
}

/**
 * Get user's organizations
 */
export function getUserOrganizations(): UserSession["organizations"] {
  const session = getSession();
  return session?.organizations || [];
}

/**
 * Get the primary organization (first organization or the one user is admin of)
 */
export function getPrimaryOrganization(): UserSession["organizations"][0] | null {
  const organizations = getUserOrganizations();
  if (organizations.length === 0) return null;

  // Prefer admin organization, otherwise return the first one
  const adminOrg = organizations.find((org) => org.role === "admin");
  return adminOrg || organizations[0];
}

/**
 * Get organization by ID
 */
export function getOrganizationById(organizationId: string): UserSession["organizations"][0] | null {
  const organizations = getUserOrganizations();
  return organizations.find((org) => org.id === organizationId) || null;
}

