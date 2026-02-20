/**
 * Permission types for admin users
 */
export interface AdminPermissions {
  canManageCourses: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canManageDepartments: boolean;
  canManageLevels: boolean;
  canViewAnalytics: boolean;
  canManageGroups: boolean;
}

/**
 * Default permissions for new admins (all false - superadmin must grant permissions)
 */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canManageCourses: false,
  canManageMembers: false,
  canManageSettings: false,
  canManageDepartments: false,
  canManageLevels: false,
  canViewAnalytics: false,
  canManageGroups: false,
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  permissions: AdminPermissions | null | undefined,
  permission: keyof AdminPermissions
): boolean {
  if (!permissions) return false;
  return permissions[permission] === true;
}

/**
 * Check if a user is a superadmin
 */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "superadmin";
}

/**
 * Check if a user is an admin (including superadmin)
 */
export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Check if a user can perform an action based on their role and permissions
 */
export function canPerformAction(
  role: string | null | undefined,
  permissions: AdminPermissions | null | undefined,
  requiredPermission?: keyof AdminPermissions
): boolean {
  // Superadmin can do everything
  if (isSuperAdmin(role)) return true;

  // Admin needs specific permission
  if (role === "admin" && requiredPermission) {
    return hasPermission(permissions, requiredPermission);
  }

  // Regular admins without specific permission check can do basic admin tasks
  if (role === "admin" && !requiredPermission) {
    return true;
  }

  return false;
}

