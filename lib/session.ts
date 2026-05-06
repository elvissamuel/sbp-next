/**
 * Session utility for managing user session data
 * In production, this should use secure session management (cookies, JWT, etc.)
 */

export interface UserSession {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null; // Computed from firstName + lastName, kept for backward compatibility
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    themePrimaryColor?: string | null;
    themeSecondaryColor?: string | null;
    themeAccentColor?: string | null;
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
 * Update the signed-in user in session (and legacy `user` storage).
 */
export function updateUserInSession(
  updates: Partial<Pick<UserSession["user"], "email" | "firstName" | "lastName" | "name">>
): void {
  if (typeof window === "undefined") return;

  const session = getSession();
  if (!session) return;

  const user = { ...session.user, ...updates };
  setSession({
    ...session,
    user,
  });

  try {
    localStorage.setItem("user", JSON.stringify(user));
  } catch (error) {
    console.error("Error updating legacy user storage:", error);
  }
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

  // Prefer superadmin or admin organization, otherwise return the first one
  const adminOrg = organizations.find((org) => org.role === "admin" || org.role === "superadmin");
  return adminOrg || organizations[0];
}

/**
 * Get organization by ID
 */
export function getOrganizationById(organizationId: string): UserSession["organizations"][0] | null {
  const organizations = getUserOrganizations();
  return organizations.find((org) => org.id === organizationId) || null;
}

/**
 * Update organization fields in session storage
 */
export function updateOrganizationInSession(
  organizationId: string,
  updates: Partial<Pick<UserSession["organizations"][0], "name" | "logo" | "themePrimaryColor" | "themeSecondaryColor" | "themeAccentColor">>
): void {
  if (typeof window === "undefined") return;

  const session = getSession();
  if (!session) return;

  const organizations = session.organizations.map((org) =>
    org.id === organizationId ? { ...org, ...updates } : org
  );

  setSession({
    ...session,
    organizations,
  });
}

/**
 * Remove an organization from the session. Clears the session if none remain.
 */
export function removeOrganizationFromSession(organizationId: string): void {
  if (typeof window === "undefined") return;

  const session = getSession();
  if (!session) return;

  const organizations = session.organizations.filter((org) => org.id !== organizationId);

  if (organizations.length === 0) {
    clearSession();
    return;
  }

  setSession({
    ...session,
    organizations,
  });
}

