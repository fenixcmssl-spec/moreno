import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest, NextResponse } from 'next/server';
import { AuthSession, SessionService } from './session';
import { UserRole, RbacService } from './rbac';
import { TenantStore } from '@/types';
import { TenantService } from '../services/tenant.service';
import { isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '../prisma';
import { INITIAL_TENANTS } from '../initialData';

/**
 * =========================================================================
 * FenixCMS SaaS Engine — Multitenant Async Execution Context
 * =========================================================================
 * Utilizes native AsyncLocalStorage to carry tenant context across
 * async execution trees and Prisma query interceptors.
 * =========================================================================
 */

export interface TenantAsyncContext {
  tenantId?: string;
  tenantSlug?: string;
  isSuperAdmin?: boolean;
  bypassTenantFilter?: boolean;
  source?: 'domain' | 'subdomain' | 'session' | 'header' | 'manual' | 'system';
  userId?: string;
  role?: UserRole;
}

class UniversalContextStorage<T> {
  private als = new AsyncLocalStorage<T>();

  getStore(): T | undefined {
    return this.als.getStore();
  }

  run<R>(store: T, fn: () => R): R {
    return this.als.run(store, fn);
  }
}

export const tenantContextStorage = new UniversalContextStorage<TenantAsyncContext>();

/**
 * Retrieve the active tenant context for the current async execution stack
 */
export function getTenantContext(): TenantAsyncContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Returns the currently active tenant ID if present
 */
export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId;
}

/**
 * Checks if tenant filtering is bypassed (e.g., SaaS Super Admin or System background jobs)
 */
export function isTenantContextBypassed(): boolean {
  const store = tenantContextStorage.getStore();
  return Boolean(store?.isSuperAdmin || store?.bypassTenantFilter);
}

/**
 * Executes a function within an explicit Tenant context
 */
export function runWithTenantContext<T>(
  context: TenantAsyncContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantContextStorage.run(context, fn);
}

/**
 * Helper to run a callback strictly bound to a tenant ID
 */
export function runWithTenant<T>(
  tenantId: string,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantContextStorage.run(
    {
      tenantId,
      bypassTenantFilter: false,
      isSuperAdmin: false,
      source: 'manual',
    },
    fn
  );
}

/**
 * Alias for runWithTenant
 */
export function withTenantContext<T>(
  tenantId: string,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return runWithTenant(tenantId, fn);
}

/**
 * Executes a function with SaaS System / SuperAdmin privileges (bypassing tenant isolation)
 */
export function runWithSystemContext<T>(
  fn: () => Promise<T> | T
): Promise<T> | T {
  return tenantContextStorage.run(
    {
      bypassTenantFilter: true,
      isSuperAdmin: true,
      source: 'system',
    },
    fn
  );
}

export interface TenantContext {
  tenant: TenantStore;
  session?: AuthSession;
  membership?: {
    role: UserRole;
    status: string;
  };
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  resolvedVia: 'session' | 'domain' | 'param' | 'default';
}

export type TenantAuthResult =
  | { success: true; context: TenantContext }
  | { success: false; response: NextResponse; context?: never };

export class TenantContextHelper {
  /**
   * Resolves a tenant by ID or slug from PostgreSQL
   */
  static async findTenantByIdOrSlug(identifier: string): Promise<TenantStore | null> {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured()) {
      const byId = await TenantService.getById(identifier);
      if (byId) return byId;

      const bySlug = await TenantService.getBySlug(clean);
      if (bySlug) return bySlug;

      // In production mode, if not in PostgreSQL, return null (no fallback to demo data)
      if (isProductionMode()) {
        return null;
      }
    }

    // Development/Test fallback only when postgres is not configured
    const found = INITIAL_TENANTS.find(t => t.id === identifier || t.slug.toLowerCase() === clean);
    return found || null;
  }

  /**
   * Resolves a tenant by verified domain/hostname
   */
  static async findTenantByHostname(hostname: string): Promise<TenantStore | null> {
    if (!hostname) return null;
    const cleanHost = hostname.trim().toLowerCase().split(':')[0].replace(/[^a-z0-9.-]/g, '');

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured()) {
      const byDomain = await TenantService.getByDomain(cleanHost);
      if (byDomain) return byDomain;

      if (isProductionMode()) {
        return null;
      }
    }

    // Development/Test fallback
    const match = INITIAL_TENANTS.find(t => {
      const d = t.domain?.toLowerCase();
      const cd = t.customDomain?.toLowerCase();
      const sub = `${t.slug}.fenixcms.es`.toLowerCase();
      return d === cleanHost || cd === cleanHost || sub === cleanHost || t.slug === cleanHost;
    });

    return match || null;
  }

  /**
   * Extracts session from NextRequest cookies or Authorization header
   */
  static async getSessionFromRequest(req: NextRequest): Promise<AuthSession | null> {
    const cookieToken = req.cookies.get(SessionService.getCookieName())?.value;
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;

    if (!token) return null;
    return await SessionService.getSession(token);
  }

  /**
   * Resolves the active tenant context for public storefronts (Domain / Host / Slug)
   */
  static async resolvePublicTenant(req: NextRequest): Promise<TenantContext | null> {
    // 1. Check custom headers from Edge Middleware
    const middlewareSlug = req.headers.get('x-tenant-slug');
    const middlewareHostname = req.headers.get('x-resolved-hostname');

    if (middlewareSlug) {
      const bySlug = await this.findTenantByIdOrSlug(middlewareSlug);
      if (bySlug) {
        return {
          tenant: bySlug,
          isSuperAdmin: false,
          isOwner: false,
          isAdmin: false,
          resolvedVia: 'domain'
        };
      }
    }

    const host = middlewareHostname || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const { searchParams } = new URL(req.url);
    const storeSlug = searchParams.get('store') || searchParams.get('slug') || searchParams.get('tenantId');

    if (storeSlug) {
      const bySlug = await this.findTenantByIdOrSlug(storeSlug);
      if (bySlug) {
        return {
          tenant: bySlug,
          isSuperAdmin: false,
          isOwner: false,
          isAdmin: false,
          resolvedVia: 'param'
        };
      }
    }

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const byDomain = await this.findTenantByHostname(host);
      if (byDomain) {
        return {
          tenant: byDomain,
          isSuperAdmin: false,
          isOwner: false,
          isAdmin: false,
          resolvedVia: 'domain'
        };
      }
    }

    // First active tenant in database
    if (isPostgresConfigured()) {
      const list = await TenantService.listTenants({ status: 'active' });
      if (list.length > 0) {
        return {
          tenant: list[0],
          isSuperAdmin: false,
          isOwner: false,
          isAdmin: false,
          resolvedVia: 'default'
        };
      }
    }

    if (!isProductionMode() && INITIAL_TENANTS.length > 0) {
      return {
        tenant: INITIAL_TENANTS[0],
        isSuperAdmin: false,
        isOwner: false,
        isAdmin: false,
        resolvedVia: 'default'
      };
    }

    return null;
  }

  /**
   * STRICT MULTI-TENANT GATEWAY
   * Authenticates user session, enforces tenant boundary, and establishes AsyncLocalStorage context
   */
  static async requireTenant(
    req: NextRequest,
    options?: {
      targetTenantId?: string;
      allowPublicFallback?: boolean;
    }
  ): Promise<TenantAuthResult> {
    const session = await this.getSessionFromRequest(req);

    if (!session) {
      if (options?.allowPublicFallback) {
        const publicCtx = await this.resolvePublicTenant(req);
        if (publicCtx) {
          return { success: true, context: publicCtx };
        }
      }
      return {
        success: false,
        response: NextResponse.json(
          { error: 'No autenticado. Se requiere sesión activa.', code: 'UNAUTHORIZED' },
          { status: 401 }
        )
      };
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';

    let resolvedTenantId: string | undefined;

    if (isSuperAdmin) {
      resolvedTenantId = options?.targetTenantId || session.tenantId;
    } else {
      resolvedTenantId = session.tenantId;

      if (options?.targetTenantId && options.targetTenantId !== resolvedTenantId) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: 'Acceso denegado: No tienes permisos sobre los recursos de este comercio (Aislamiento Multi-Tenant violado).',
              code: 'TENANT_FORBIDDEN'
            },
            { status: 403 }
          )
        };
      }
    }

    if (!resolvedTenantId) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'La sesión no tiene un comercio asociado asignado.', code: 'NO_TENANT_ASSIGNED' },
          { status: 400 }
        )
      };
    }

    const tenant = await this.findTenantByIdOrSlug(resolvedTenantId);
    if (!tenant) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Comercio no encontrado en el sistema.', code: 'TENANT_NOT_FOUND' },
          { status: 404 }
        )
      };
    }

    if (tenant.status === 'suspended' && !isSuperAdmin) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Este comercio está suspendido por falta de pago o infracción de términos.', code: 'TENANT_SUSPENDED' },
          { status: 403 }
        )
      };
    }

    // Multi-tenant membership validation: For non-superadmin users, strictly check PostgreSQL TenantMembership
    let effectiveRole: UserRole = session.role;
    let membershipStatus = 'ACTIVE';

    if (!isSuperAdmin) {
      const membershipCheck = await TenantService.validateUserMembership(session.userId, tenant.id);
      if (!membershipCheck.valid || !membershipCheck.membership) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: membershipCheck.error || 'Acceso denegado: No tienes membresía activa en este comercio.',
              code: 'MEMBERSHIP_REQUIRED'
            },
            { status: 403 }
          )
        };
      }
      effectiveRole = membershipCheck.membership.role;
      membershipStatus = membershipCheck.membership.status;
    }

    const isOwner = isSuperAdmin || effectiveRole === 'OWNER' || effectiveRole === 'TENANT_OWNER';
    const isAdmin = isOwner || effectiveRole === 'ADMIN' || effectiveRole === 'TENANT_ADMIN';

    return {
      success: true,
      context: {
        tenant,
        session: {
          ...session,
          role: effectiveRole
        },
        membership: {
          role: effectiveRole,
          status: membershipStatus
        },
        isSuperAdmin,
        isOwner,
        isAdmin,
        resolvedVia: 'session'
      }
    };
  }

  /**
   * Verifies that the user has at least the specified minimum role in the tenant
   */
  static async requireTenantRole(
    req: NextRequest,
    minRole: UserRole,
    options?: {
      targetTenantId?: string;
    }
  ): Promise<TenantAuthResult> {
    const auth = await this.requireTenant(req, options);
    if (!auth.success) {
      return auth;
    }

    const userRole = auth.context.session?.role || 'CUSTOMER';

    if (!RbacService.hasMinRole(userRole, minRole)) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: `Permisos insuficientes. Se requiere rol mínimo ${minRole} (tu rol: ${userRole}).`,
            code: 'INSUFFICIENT_PERMISSIONS'
          },
          { status: 403 }
        )
      };
    }

    return auth;
  }

  /**
   * Verifies that a tenant has an entitlement / feature enabled in their SaaS plan via EntitlementService
   * STRICT DENY BY DEFAULT
   */
  static async requireEntitlement(
    contextOrReq: TenantContext | NextRequest,
    entitlementKey: string,
    options?: {
      targetTenantId?: string;
      currentCount?: number;
      increment?: number;
    } | number
  ): Promise<{ success: boolean; allowed: boolean; limit?: number; reason?: string; response?: NextResponse }> {
    let context: TenantContext;

    if ('tenant' in contextOrReq) {
      context = contextOrReq;
    } else {
      const auth = await this.requireTenant(contextOrReq, {
        targetTenantId: typeof options === 'object' ? options.targetTenantId : undefined
      });
      if (!auth.success) {
        return { success: false, allowed: false, response: auth.response };
      }
      context = auth.context;
    }

    if (context.isSuperAdmin) {
      return { success: true, allowed: true };
    }

    const { EntitlementService } = await import('@/lib/services/entitlement.service');

    const increment = typeof options === 'object' && options.increment !== undefined ? options.increment : 1;
    const isResource = entitlementKey.includes('.max') || entitlementKey.includes('_max') || entitlementKey.includes('.max_mb') || entitlementKey.includes('storage') || entitlementKey === 'products' || entitlementKey === 'orders' || entitlementKey === 'users' || entitlementKey === 'domains';

    if (isResource) {
      const check = await EntitlementService.checkResource(context.tenant, entitlementKey, increment);
      if (!check.allowed) {
        return {
          success: false,
          allowed: false,
          limit: check.limit,
          reason: check.reason,
          response: NextResponse.json(
            {
              error: check.reason,
              code: 'ENTITLEMENT_LIMIT_REACHED',
              resource: check.resource,
              limit: check.limit,
              current: check.current,
              remaining: check.remaining
            },
            { status: 403 }
          )
        };
      }
    } else {
      const canAccess = await EntitlementService.can(context.tenant, entitlementKey);
      if (!canAccess) {
        const reason = `Acceso denegado: La función '${entitlementKey}' no está habilitada en tu plan de suscripción actual. Actualiza tu suscripción para desbloquear esta funcionalidad.`;
        return {
          success: false,
          allowed: false,
          reason,
          response: NextResponse.json(
            {
              error: reason,
              code: 'ENTITLEMENT_FEATURE_LOCKED',
              feature: entitlementKey
            },
            { status: 403 }
          )
        };
      }
    }

    return { success: true, allowed: true };
  }
}
