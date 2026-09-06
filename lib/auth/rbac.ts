export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'TENANT_OWNER' 
  | 'TENANT_ADMIN' 
  | 'EDITOR' 
  | 'CUSTOMER';

export interface PermissionCheckParams {
  userRole: UserRole;
  requiredRole: UserRole;
  userTenantId?: string;
  targetTenantId?: string;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  TENANT_OWNER: 80,
  TENANT_ADMIN: 60,
  EDITOR: 40,
  CUSTOMER: 10
};

export class RbacService {
  /**
   * Checks if user has equal or higher authority than the required role
   */
  static hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  }

  /**
   * Validates multi-tenant boundary access
   */
  static canAccessTenant(userRole: UserRole, userTenantId: string | undefined, targetTenantId: string): boolean {
    if (userRole === 'SUPER_ADMIN') return true;
    if (!userTenantId) return false;
    return userTenantId === targetTenantId;
  }

  /**
   * Evaluates feature access based on license entitlements
   */
  static isFeatureAllowed(
    entitlements: Record<string, any> = {},
    featureKey: string
  ): boolean {
    if (entitlements[featureKey] !== undefined) {
      return Boolean(entitlements[featureKey]);
    }
    return true; // Default fallback
  }

  /**
   * Checks numerical limit against tenant current usage
   */
  static checkLimit(
    entitlements: Record<string, any> = {},
    limitKey: string,
    currentCount: number
  ): { allowed: boolean; limit: number; current: number } {
    const limit = typeof entitlements[limitKey] === 'number' ? entitlements[limitKey] : 999999;
    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount
    };
  }
}
