import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { TenantStore, EntityStatus } from '@/types';
import { UserRole } from '@/lib/auth/rbac';

export interface CreateTenantInput {
  id?: string;
  name: string;
  slug: string;
  domain?: string;
  customDomain?: string;
  applicationId?: string;
  planId: string;
  licenseKey: string;
  ownerEmail: string;
  ownerName: string;
  ownerUserId?: string;
  themeId?: string;
  currency?: string;
  defaultLocale?: string;
  supportedLocales?: string[];
  branding?: any;
  settings?: any;
  activePlugins?: string[];
  status?: 'active' | 'suspended' | 'trial' | 'expired' | 'archived';
}

export interface TenantMembershipRecord {
  id: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  userName?: string;
  userEmail?: string;
  tenantName?: string;
  tenantSlug?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * =========================================================================
 * FenixCMS SaaS Engine — PostgreSQL Tenant & Membership Service
 * =========================================================================
 * Single source of truth for Tenant and TenantMembership persistence.
 * Enforces strict multi-tenant isolation, atomic transactions with
 * `prisma.$transaction`, and membership role validation.
 * =========================================================================
 */
export class TenantService {
  /**
   * Helper to map Prisma Tenant model to TenantStore interface
   */
  public static mapPrismaToTenantStore(t: any): TenantStore {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.domain || undefined,
      customDomain: t.customDomain || undefined,
      status: t.status as any,
      applicationId: t.applicationId as any,
      enabledApplications: [t.applicationId as any],
      planId: t.planId,
      licenseKey: t.licenseKey,
      ownerEmail: t.ownerEmail,
      ownerName: t.ownerName,
      themeId: t.themeId,
      currency: t.currency,
      defaultLocale: t.defaultLocale,
      supportedLocales: Array.isArray(t.supportedLocales) ? t.supportedLocales : ['es'],
      branding: t.branding as any,
      settings: t.settings as any,
      activePlugins: Array.isArray(t.activePlugins) ? t.activePlugins : [],
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString()
    };
  }

  /**
   * Creates a tenant atomically with owner membership and default domain
   */
  static async createTenant(data: CreateTenantInput): Promise<TenantStore> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('Tenant creation failed: PostgreSQL is required in production.');
    }

    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (isPostgresConfigured() && prisma?.tenant) {
      // Execute atomically in a transaction
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.tenant.findFirst({
          where: {
            OR: [
              { slug: cleanSlug },
              { licenseKey: data.licenseKey }
            ]
          }
        });

        if (existing) {
          throw new Error(`Ya existe un comercio registrado con el slug '${cleanSlug}' o clave de licencia.`);
        }

        const tenant = await tx.tenant.create({
          data: {
            ...(data.id ? { id: data.id } : {}),
            name: data.name.trim(),
            slug: cleanSlug,
            domain: data.domain || `${cleanSlug}.fenixcms.es`,
            customDomain: data.customDomain || null,
            status: data.status || 'active',
            applicationId: data.applicationId || 'ECOMMERCE',
            planId: data.planId,
            licenseKey: data.licenseKey,
            ownerEmail: data.ownerEmail.trim().toLowerCase(),
            ownerName: data.ownerName.trim(),
            themeId: data.themeId || 'theme_modern_luxe',
            currency: data.currency || 'EUR',
            defaultLocale: data.defaultLocale || 'es',
            supportedLocales: data.supportedLocales || ['es', 'it', 'en', 'fr', 'de', 'pt'],
            branding: data.branding || {
              businessName: data.name,
              primaryColor: '#0f172a',
              accentColor: '#3b82f6',
              tagline: 'Comercio Online'
            },
            settings: data.settings || {},
            activePlugins: data.activePlugins || ['plugin_correos_pro', 'plugin_stripe_connect', 'plugin_seo_pro']
          }
        });

        // 1. Create default system subdomain
        await tx.domain.create({
          data: {
            tenantId: tenant.id,
            hostname: `${cleanSlug}.fenixcms.es`,
            type: 'SYSTEM_SUBDOMAIN',
            status: 'active',
            verified: true,
            isPrimary: !data.customDomain
          }
        }).catch(() => {});

        // 2. If custom domain specified, register it
        if (data.customDomain) {
          await tx.domain.create({
            data: {
              tenantId: tenant.id,
              hostname: data.customDomain.trim().toLowerCase(),
              type: 'CUSTOM_DOMAIN',
              status: 'active',
              verified: true,
              isPrimary: true
            }
          }).catch(() => {});
        }

        // 3. Associate Owner Membership if ownerUserId is provided or user exists with ownerEmail
        let ownerUser = data.ownerUserId 
          ? await tx.user.findUnique({ where: { id: data.ownerUserId } })
          : await tx.user.findUnique({ where: { email: data.ownerEmail.trim().toLowerCase() } });

        if (ownerUser) {
          await tx.tenantMembership.create({
            data: {
              tenantId: tenant.id,
              userId: ownerUser.id,
              role: 'OWNER',
              status: 'ACTIVE'
            }
          });
        }

        return TenantService.mapPrismaToTenantStore(tenant);
      });
    }

    throw new DatabaseConfigurationError('Database is not available for tenant creation.');
  }

  /**
   * Retrieves a tenant by ID from PostgreSQL
   */
  static async getById(id: string): Promise<TenantStore | null> {
    if (!id) return null;
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant?.findUnique) {
      const tenant = await prisma.tenant.findUnique({
        where: { id }
      });
      return tenant ? this.mapPrismaToTenantStore(tenant) : null;
    }

    return null;
  }

  /**
   * Retrieves a tenant by unique slug from PostgreSQL
   */
  static async getBySlug(slug: string): Promise<TenantStore | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant?.findUnique) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: cleanSlug }
      });
      return tenant ? this.mapPrismaToTenantStore(tenant) : null;
    }

    return null;
  }

  /**
   * Retrieves a tenant by domain hostname
   */
  static async getByDomain(hostname: string): Promise<TenantStore | null> {
    if (!hostname) return null;
    const cleanHost = hostname.trim().toLowerCase().split(':')[0];

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { domain: cleanHost },
            { customDomain: cleanHost },
            { domains: { some: { hostname: cleanHost, status: 'active' } } }
          ]
        }
      });
      if (tenant) return this.mapPrismaToTenantStore(tenant);

      // Subdomain format check (e.g. mitienda.fenixcms.es)
      if (cleanHost.endsWith('.fenixcms.es')) {
        const subSlug = cleanHost.replace('.fenixcms.es', '');
        const bySlug = await prisma.tenant.findUnique({ where: { slug: subSlug } });
        if (bySlug) return this.mapPrismaToTenantStore(bySlug);
      }
    }

    return null;
  }

  /**
   * Lists tenants with optional search, status, and user-membership filtering
   */
  static async listTenants(options?: {
    userId?: string;
    status?: string;
    search?: string;
    applicationId?: string;
  }): Promise<TenantStore[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant?.findMany) {
      const where: any = {};
      if (options?.status) where.status = options.status;
      if (options?.applicationId) where.applicationId = options.applicationId;
      if (options?.userId) {
        where.memberships = {
          some: { userId: options.userId }
        };
      }
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { slug: { contains: options.search, mode: 'insensitive' } },
          { ownerEmail: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      const tenants = await prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return tenants.map(t => this.mapPrismaToTenantStore(t));
    }

    return [];
  }

  /**
   * Updates tenant data in PostgreSQL
   */
  static async updateTenant(id: string, data: Partial<CreateTenantInput>): Promise<TenantStore> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant?.update) {
      const updateData: any = {};
      if (data.name) updateData.name = data.name.trim();
      if (data.domain) updateData.domain = data.domain.trim().toLowerCase();
      if (data.customDomain !== undefined) updateData.customDomain = data.customDomain ? data.customDomain.trim().toLowerCase() : null;
      if (data.status) updateData.status = data.status;
      if (data.themeId) updateData.themeId = data.themeId;
      if (data.currency) updateData.currency = data.currency;
      if (data.defaultLocale) updateData.defaultLocale = data.defaultLocale;
      if (data.supportedLocales) updateData.supportedLocales = data.supportedLocales;
      if (data.branding) updateData.branding = data.branding;
      if (data.settings) updateData.settings = data.settings;
      if (data.activePlugins) updateData.activePlugins = data.activePlugins;
      if (data.planId) updateData.planId = data.planId;
      if (data.licenseKey) updateData.licenseKey = data.licenseKey;

      const updated = await prisma.tenant.update({
        where: { id },
        data: updateData
      });

      return this.mapPrismaToTenantStore(updated);
    }

    throw new DatabaseConfigurationError('Database is not available for tenant update.');
  }

  /**
   * Suspends or updates status of a tenant
   */
  static async updateStatus(id: string, status: 'active' | 'suspended' | 'trial' | 'expired' | 'archived'): Promise<TenantStore> {
    return this.updateTenant(id, { status });
  }

  /**
   * Deletes a tenant from PostgreSQL (cascading deletes related records)
   */
  static async deleteTenant(id: string): Promise<boolean> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenant?.delete) {
      await prisma.tenant.delete({
        where: { id }
      });
      return true;
    }

    return false;
  }

  // =========================================================================
  // TENANT MEMBERSHIP MANAGEMENT
  // =========================================================================

  /**
   * Adds a user membership to a tenant
   */
  static async addMembership(data: {
    tenantId: string;
    userId: string;
    role: UserRole;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  }): Promise<TenantMembershipRecord> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenantMembership) {
      const membership = await prisma.tenantMembership.upsert({
        where: {
          tenantId_userId: {
            tenantId: data.tenantId,
            userId: data.userId
          }
        },
        update: {
          role: data.role,
          status: data.status || 'ACTIVE'
        },
        create: {
          tenantId: data.tenantId,
          userId: data.userId,
          role: data.role,
          status: data.status || 'ACTIVE'
        },
        include: {
          user: true,
          tenant: true
        }
      });

      return {
        id: membership.id,
        tenantId: membership.tenantId,
        userId: membership.userId,
        role: membership.role as UserRole,
        status: membership.status as any,
        userName: membership.user.name,
        userEmail: membership.user.email,
        tenantName: membership.tenant.name,
        tenantSlug: membership.tenant.slug,
        createdAt: membership.createdAt.toISOString(),
        updatedAt: membership.updatedAt.toISOString()
      };
    }

    throw new DatabaseConfigurationError('Database is not available for membership creation.');
  }

  /**
   * Validates if a user has valid membership in a tenant (Tenant Isolation Guard)
   */
  static async validateUserMembership(
    userId: string,
    tenantId: string,
    minRole?: UserRole
  ): Promise<{ valid: boolean; membership?: TenantMembershipRecord; error?: string }> {
    if (!userId || !tenantId) {
      return { valid: false, error: 'Usuario o comercio no especificado' };
    }

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenantMembership) {
      const membership = await prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId
          }
        },
        include: {
          user: true,
          tenant: true
        }
      });

      if (!membership) {
        return { valid: false, error: 'Acceso denegado: El usuario no pertenece a este comercio' };
      }

      if (membership.status !== 'ACTIVE') {
        return { valid: false, error: 'La membresía en este comercio se encuentra inactiva o suspendida' };
      }

      return {
        valid: true,
        membership: {
          id: membership.id,
          tenantId: membership.tenantId,
          userId: membership.userId,
          role: membership.role as UserRole,
          status: membership.status as any,
          userName: membership.user.name,
          userEmail: membership.user.email,
          tenantName: membership.tenant.name,
          tenantSlug: membership.tenant.slug,
          createdAt: membership.createdAt.toISOString(),
          updatedAt: membership.updatedAt.toISOString()
        }
      };
    }

    return { valid: false, error: 'Base de datos no disponible' };
  }

  /**
   * Removes a user membership from a tenant
   */
  static async removeMembership(tenantId: string, userId: string): Promise<boolean> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenantMembership?.deleteMany) {
      await prisma.tenantMembership.deleteMany({
        where: {
          tenantId,
          userId
        }
      });
      return true;
    }

    return false;
  }

  /**
   * Retrieves all members of a tenant
   */
  static async getTenantMembers(tenantId: string): Promise<TenantMembershipRecord[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.tenantMembership?.findMany) {
      const members = await prisma.tenantMembership.findMany({
        where: { tenantId },
        include: {
          user: true,
          tenant: true
        },
        orderBy: { createdAt: 'asc' }
      });

      return members.map(m => ({
        id: m.id,
        tenantId: m.tenantId,
        userId: m.userId,
        role: m.role as UserRole,
        status: m.status as any,
        userName: m.user.name,
        userEmail: m.user.email,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString()
      }));
    }

    return [];
  }
}
