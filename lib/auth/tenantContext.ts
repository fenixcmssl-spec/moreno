import { NextRequest, NextResponse } from 'next/server';
import { AuthSession, SessionService } from './session';
import { UserRole, RbacService } from './rbac';
import { INITIAL_TENANTS } from '../initialData';
import { TenantStore } from '@/types';
import prisma from '../prisma';

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
   * Resolves a tenant by ID or slug from PostgreSQL or fallback store
   */
  static async findTenantByIdOrSlug(identifier: string): Promise<TenantStore | null> {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).tenant?.findFirst === 'function') {
        const dbTenant = await (prisma as any).tenant.findFirst({
          where: {
            OR: [
              { id: identifier },
              { slug: clean }
            ]
          }
        });
        if (dbTenant) {
          return {
            id: dbTenant.id,
            name: dbTenant.name,
            slug: dbTenant.slug,
            domain: dbTenant.domain || undefined,
            customDomain: dbTenant.customDomain || undefined,
            status: dbTenant.status as any,
            applicationId: dbTenant.applicationId as any,
            enabledApplications: [dbTenant.applicationId as any],
            planId: dbTenant.planId,
            licenseKey: dbTenant.licenseKey,
            ownerEmail: dbTenant.ownerEmail,
            ownerName: dbTenant.ownerName,
            themeId: dbTenant.themeId,
            currency: dbTenant.currency,
            defaultLocale: dbTenant.defaultLocale,
            supportedLocales: dbTenant.supportedLocales,
            branding: dbTenant.branding as any,
            settings: dbTenant.settings as any,
            activePlugins: dbTenant.activePlugins,
            createdAt: dbTenant.createdAt.toISOString()
          };
        }
      }
    } catch (e) {
      // Graceful fallback
    }

    const found = INITIAL_TENANTS.find(t => t.id === identifier || t.slug.toLowerCase() === clean);
    return found || null;
  }

  /**
   * Resolves a tenant by verified domain/hostname
   */
  static async findTenantByHostname(hostname: string): Promise<TenantStore | null> {
    if (!hostname) return null;
    const cleanHost = hostname.trim().toLowerCase().split(':')[0].replace(/[^a-z0-9.-]/g, '');

    try {
      if (process.env.DATABASE_URL && prisma && typeof (prisma as any).tenant?.findFirst === 'function') {
        // 1. Direct domain match or verified Domain table match
        const dbTenant = await (prisma as any).tenant.findFirst({
          where: {
            OR: [
              { domain: cleanHost },
              { customDomain: cleanHost },
              { domains: { some: { hostname: cleanHost, status: 'active' } } }
            ]
          }
        });
        if (dbTenant) {
          return {
            id: dbTenant.id,
            name: dbTenant.name,
            slug: dbTenant.slug,
            domain: dbTenant.domain || undefined,
            customDomain: dbTenant.customDomain || undefined,
            status: dbTenant.status as any,
            applicationId: dbTenant.applicationId as any,
            enabledApplications: [dbTenant.applicationId as any],
            planId: dbTenant.planId,
            licenseKey: dbTenant.licenseKey,
            ownerEmail: dbTenant.ownerEmail,
            ownerName: dbTenant.ownerName,
            themeId: dbTenant.themeId,
            currency: dbTenant.currency,
            defaultLocale: dbTenant.defaultLocale,
            supportedLocales: dbTenant.supportedLocales,
            branding: dbTenant.branding as any,
            settings: dbTenant.settings as any,
            activePlugins: dbTenant.activePlugins,
            createdAt: dbTenant.createdAt.toISOString()
          };
        }

        // 2. Subdomain check (*.fenixcms.es)
        if (cleanHost.endsWith('.fenixcms.es')) {
          const subSlug = cleanHost.replace('.fenixcms.es', '');
          const bySlug = await (prisma as any).tenant.findUnique({
            where: { slug: subSlug }
          });
          if (bySlug) {
            return {
              id: bySlug.id,
              name: bySlug.name,
              slug: bySlug.slug,
              domain: bySlug.domain || undefined,
              customDomain: bySlug.customDomain || undefined,
              status: bySlug.status as any,
              applicationId: bySlug.applicationId as any,
              enabledApplications: [bySlug.applicationId as any],
              planId: bySlug.planId,
              licenseKey: bySlug.licenseKey,
              ownerEmail: bySlug.ownerEmail,
              ownerName: bySlug.ownerName,
              themeId: bySlug.themeId,
              currency: bySlug.currency,
              defaultLocale: bySlug.defaultLocale,
              supportedLocales: bySlug.supportedLocales,
              branding: bySlug.branding as any,
              settings: bySlug.settings as any,
              activePlugins: bySlug.activePlugins,
              createdAt: bySlug.createdAt.toISOString()
            };
          }
        }
      }
    } catch (e) {
      // Graceful fallback
    }

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
  static async resolvePublicTenant(req: NextRequest): Promise<TenantContext> {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
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

    // Default demo tenant
    const defaultTenant = INITIAL_TENANTS[0];
    return {
      tenant: defaultTenant,
      isSuperAdmin: false,
      isOwner: false,
      isAdmin: false,
      resolvedVia: 'default'
    };
  }

  /**
   * STRICT MULTI-TENANT GATEWAY
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
        return { success: true, context: publicCtx };
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
      resolvedTenantId = options?.targetTenantId || session.tenantId || INITIAL_TENANTS[0].id;
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

    const isOwner = session.role === 'OWNER' || session.role === 'TENANT_OWNER' || session.role === 'SUPER_ADMIN';
    const isAdmin = isOwner || session.role === 'ADMIN' || session.role === 'TENANT_ADMIN';

    return {
      success: true,
      context: {
        tenant,
        session,
        membership: {
          role: session.role,
          status: 'ACTIVE'
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

    // Dynamic import / call to EntitlementService
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
