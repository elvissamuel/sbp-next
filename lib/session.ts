/**
 * Session utility for managing user session data
 * In production, this should use secure session management (cookies, JWT, etc.)
 */

const ACTIVE_ORGANIZATION_KEY = "activeOrganizationId"
const SYSTEM_ORG_SLUG = "system-default-courses"

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
  localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
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

function selectableOrganizations(): UserSession["organizations"] {
  return getUserOrganizations().filter((org) => org.slug !== SYSTEM_ORG_SLUG);
}

export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}

export function setActiveOrganization(organizationId: string): void {
  if (typeof window === "undefined") return;

  const organization = selectableOrganizations().find((org) => org.id === organizationId);
  if (!organization) return;

  localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
  window.dispatchEvent(new Event("session-changed"));
}

export function getPrimaryOrganization(): UserSession["organizations"][0] | null {
  const organizations = selectableOrganizations();
  if (organizations.length === 0) return null;

  const activeOrganization = organizations.find((org) => org.id === getActiveOrganizationId());
  if (activeOrganization) return activeOrganization;

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

  if (getActiveOrganizationId() === organizationId) {
    localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }

  if (organizations.length === 0) {
    clearSession();
    return;
  }

  setSession({
    ...session,
    organizations,
  });
}

