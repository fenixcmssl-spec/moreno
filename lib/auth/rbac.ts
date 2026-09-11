export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'EDITOR' 
  | 'STAFF'
  | 'CUSTOMER'
  | 'TENANT_OWNER' 
  | 'TENANT_ADMIN';

export interface PermissionCheckParams {
  userRole: UserRole;
  requiredRole: UserRole;
  userTenantId?: string;
  targetTenantId?: string;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  OWNER: 80,
  TENANT_OWNER: 80,
  ADMIN: 70,
  TENANT_ADMIN: 60,
  MANAGER: 50,
  EDITOR: 40,
  STAFF: 30,
  CUSTOMER: 10
};

export class RbacService {
  /**
   * Checks if user has equal or higher authority than the required role
   */
  static hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  }

  static hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return this.hasMinimumRole(userRole, requiredRole);
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
   * STRICT DENY BY DEFAULT: if missing or not strictly boolean true => false
   */
  static isFeatureAllowed(
    entitlements: Record<string, any> = {},
    featureKey: string
  ): boolean {
    if (!entitlements || typeof entitlements !== 'object') {
      return false;
    }
    return Boolean(entitlements[featureKey] === true);
  }

  /**
   * Checks numerical limit against tenant current usage
   * STRICT DENY BY DEFAULT: if missing or undefined limit => 0 limit
   */
  static checkLimit(
    entitlements: Record<string, any> = {},
    limitKey: string,
    currentCount: number
  ): { allowed: boolean; limit: number; current: number } {
    const raw = entitlements?.[limitKey];
    const limit = typeof raw === 'number' ? raw : 0;
    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount
    };
  }
}
