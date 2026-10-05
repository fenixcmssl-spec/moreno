import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { TenantStore, EntityStatus, SaaSLicense } from '@/types';
import { UserRole } from '@/lib/auth/rbac';
import { LicenseService } from './license.service';
import { INITIAL_TENANTS } from '@/lib/initialData';

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

export interface ProvisionTenantParams {
  tenantId?: string;
  name: string;
  slug: string;
  applicationId?: string;
  planId: string;
  ownerName: string;
  ownerEmail: string;
  ownerUserId?: string;
  billingPeriod?: 'monthly' | 'yearly';
  paymentProvider?: string;
  transactionId?: string;
  price?: number;
  currency?: string;
  themeId?: string;
  customDomain?: string;
  branding?: any;
  settings?: any;
  activePlugins?: string[];
  activationLimit?: number;
}

export interface ProvisionTenantResult {
  tenant: TenantStore;
  license: SaaSLicense & { displayKey: string };
  defaultDomain: string;
  redirectUrl: string;
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
      return await prisma.$transaction(async (tx: any) => {
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

        // 4. Atomically provision License and LicenseActivation in the same transaction
        const keyHash = LicenseService.hashLicenseKey(data.licenseKey);
        const validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1);

        const createdLicense = await tx.license.create({
          data: {
            licenseKeyHash: keyHash,
            displayKey: data.licenseKey,
            tenantId: tenant.id,
            applicationId: data.applicationId || 'ECOMMERCE',
            planId: data.planId,
            status: 'ACTIVE',
            startsAt: new Date(),
            expiresAt: validTo,
            activationLimit: 3,
            activationCount: 1,
            customerName: data.ownerName.trim(),
            customerEmail: data.ownerEmail.trim().toLowerCase(),
            price: 0,
            currency: data.currency || 'EUR',
            billingPeriod: 'yearly'
          }
        });

        await tx.licenseActivation.create({
          data: {
            licenseId: createdLicense.id,
            tenantId: tenant.id,
            domain: data.domain || `${cleanSlug}.fenixcms.es`,
            environment: 'production',
            status: 'ACTIVE'
          }
        });

        return TenantService.mapPrismaToTenantStore(tenant);
      });
    }

    throw new DatabaseConfigurationError('Database is not available for tenant creation.');
  }

  /**
   * Complete atomic provisioning of Tenant + License + Domain + Membership (FASE 7)
   * Guaranteed all-or-nothing transactional safety with automatic rollback on any failure.
   */
  static async provisionTenantWithLicenseAsync(params: ProvisionTenantParams): Promise<ProvisionTenantResult> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('Tenant provisioning failed: PostgreSQL is required in production.');
    }

    const cleanSlug = params.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const defaultDomain = `${cleanSlug}.fenixcms.es`;
    const targetTenantId = params.tenantId || `tenant_${cleanSlug}`;

    // 1. Generate secure cryptographic license key
    const { displayKey, keyHash } = LicenseService.generateSecureLicenseKey(
      params.applicationId || 'ECO',
      params.planId || 'PRO',
      cleanSlug
    );

    const now = new Date();
    const validTo = new Date(now);
    if (params.billingPeriod === 'yearly') {
      validTo.setFullYear(validTo.getFullYear() + 1);
    } else {
      validTo.setMonth(validTo.getMonth() + 1);
    }

    if (isPostgresConfigured() && prisma) {
      return await prisma.$transaction(async (tx: any) => {
        // A. Verify uniqueness
        const existingTenant = await tx.tenant.findFirst({
          where: {
            OR: [
              { id: targetTenantId },
              { slug: cleanSlug },
              { licenseKey: displayKey }
            ]
          }
        });

        if (existingTenant) {
          throw new Error(`Ya existe un comercio registrado con el identificador '${cleanSlug}'.`);
        }

        // B. Resolve Plan
        let plan = await tx.plan.findUnique({
          where: { id: params.planId },
          include: { entitlements: true }
        });

        if (!plan) {
          plan = await tx.plan.findFirst({
            where: { slug: params.planId },
            include: { entitlements: true }
          });
        }

        const planPrice = params.price ?? Number(
          params.billingPeriod === 'yearly' 
            ? (plan?.yearlyPrice ?? 490) 
            : (plan?.monthlyPrice ?? 49)
        );

        // C. Create Tenant
        const createdTenant = await tx.tenant.create({
          data: {
            id: targetTenantId,
            name: params.name.trim(),
            slug: cleanSlug,
            domain: defaultDomain,
            customDomain: params.customDomain ? params.customDomain.trim().toLowerCase() : null,
            status: 'active',
            applicationId: params.applicationId || 'ECOMMERCE',
            planId: plan ? plan.id : params.planId,
            licenseKey: displayKey,
            ownerEmail: params.ownerEmail.trim().toLowerCase(),
            ownerName: params.ownerName.trim(),
            themeId: params.themeId || 'theme_modern_luxe',
            currency: params.currency || 'EUR',
            defaultLocale: 'es',
            supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
            branding: params.branding || {
              businessName: params.name,
              primaryColor: '#0f172a',
              accentColor: '#3b82f6',
              tagline: 'Comercio Online'
            },
            settings: params.settings || {},
            activePlugins: params.activePlugins || ['plugin_correos_pro', 'plugin_stripe_connect', 'plugin_seo_pro']
          }
        });

        // D. Create License
        const createdLicense = await tx.license.create({
          data: {
            licenseKeyHash: keyHash,
            displayKey,
            tenantId: createdTenant.id,
            applicationId: params.applicationId || 'ECOMMERCE',
            planId: plan ? plan.id : params.planId,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt: validTo,
            activationLimit: params.activationLimit || 3,
            activationCount: 1,
            customerName: params.ownerName.trim(),
            customerEmail: params.ownerEmail.trim().toLowerCase(),
            price: planPrice,
            currency: params.currency || 'EUR',
            billingPeriod: params.billingPeriod || 'monthly'
          },
          include: {
            tenant: true,
            plan: { include: { entitlements: true } }
          }
        });

        // E. Create LicenseActivation for default subdomain
        await tx.licenseActivation.create({
          data: {
            licenseId: createdLicense.id,
            tenantId: createdTenant.id,
            domain: defaultDomain,
            environment: 'production',
            status: 'ACTIVE'
          }
        });

        // F. Create System Subdomain
        await tx.domain.create({
          data: {
            tenantId: createdTenant.id,
            hostname: defaultDomain,
            type: 'SYSTEM_SUBDOMAIN',
            status: 'active',
            verified: true,
            isPrimary: !params.customDomain
          }
        });

        // G. Create Custom Domain if specified
        if (params.customDomain) {
          const cleanCustom = params.customDomain.trim().toLowerCase();
          await tx.domain.create({
            data: {
              tenantId: createdTenant.id,
              hostname: cleanCustom,
              type: 'CUSTOM_DOMAIN',
              status: 'active',
              verified: true,
              isPrimary: true
            }
          });

          await tx.licenseActivation.create({
            data: {
              licenseId: createdLicense.id,
              tenantId: createdTenant.id,
              domain: cleanCustom,
              environment: 'production',
              status: 'ACTIVE'
            }
          });
        }

        // H. Associate Owner Membership
        let ownerUser = params.ownerUserId 
          ? await tx.user.findUnique({ where: { id: params.ownerUserId } })
          : await tx.user.findUnique({ where: { email: params.ownerEmail.trim().toLowerCase() } });

        if (ownerUser) {
          await tx.tenantMembership.create({
            data: {
              tenantId: createdTenant.id,
              userId: ownerUser.id,
              role: 'OWNER',
              status: 'ACTIVE'
            }
          });
        }

        const mappedTenant = TenantService.mapPrismaToTenantStore(createdTenant);
        const mappedLicense = LicenseService.mapPrismaToSaaSLicense(createdLicense);

        return {
          tenant: mappedTenant,
          license: mappedLicense,
          defaultDomain,
          redirectUrl: `/admin?tenant=${cleanSlug}`
        };
      });
    }

    // Fallback for memory dev/test mode
    const fallbackTenant: TenantStore = {
      id: targetTenantId,
      name: params.name,
      slug: cleanSlug,
      domain: defaultDomain,
      customDomain: params.customDomain,
      status: 'active',
      applicationId: (params.applicationId as any) || 'ECOMMERCE',
      enabledApplications: [(params.applicationId as any) || 'ECOMMERCE'],
      planId: params.planId,
      licenseKey: displayKey,
      ownerEmail: params.ownerEmail,
      ownerName: params.ownerName,
      themeId: params.themeId || 'theme_modern_luxe',
      currency: params.currency || 'EUR',
      defaultLocale: 'es',
      supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
      branding: params.branding || {},
      settings: params.settings || {},
      activePlugins: params.activePlugins || [],
      createdAt: now.toISOString()
    };

    const fallbackLicense: any = {
      id: `lic_${Date.now()}`,
      licenseKey: displayKey,
      displayKey,
      tenantId: targetTenantId,
      tenantName: params.name,
      tenantSlug: cleanSlug,
      applicationId: params.applicationId || 'ECOMMERCE',
      planId: params.planId,
      planName: params.planId.toUpperCase(),
      status: 'active',
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      customerName: params.ownerName,
      customerEmail: params.ownerEmail,
      price: params.price ?? 49,
      paymentProvider: params.paymentProvider || 'paypal',
      transactionId: params.transactionId || `tx_${Date.now()}`,
      billingPeriod: params.billingPeriod || 'monthly',
      activationLimit: params.activationLimit || 3,
      entitlements: {},
      createdAt: now.toISOString()
    };

    return {
      tenant: fallbackTenant,
      license: fallbackLicense,
      defaultDomain,
      redirectUrl: `/admin?tenant=${cleanSlug}`
    };
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
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id }
        });
        if (tenant) return this.mapPrismaToTenantStore(tenant);
        if (isProductionMode()) return null;
      } catch (err) {
        if (isProductionMode()) throw err;
      }
    }

    return INITIAL_TENANTS.find(t => t.id === id) || null;
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
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { slug: cleanSlug }
        });
        if (tenant) return this.mapPrismaToTenantStore(tenant);
        if (isProductionMode()) return null;
      } catch (err) {
        if (isProductionMode()) throw err;
      }
    }

    return INITIAL_TENANTS.find(t => t.slug === cleanSlug) || null;
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
      try {
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

        if (isProductionMode()) return null;
      } catch (err) {
        if (isProductionMode()) throw err;
      }
    }

    return INITIAL_TENANTS.find(t => t.domain === cleanHost || t.customDomain === cleanHost) || null;
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
      try {
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

        if (tenants && tenants.length > 0) {
          return tenants.map((t: any) => this.mapPrismaToTenantStore(t));
        }

        if (isProductionMode()) return [];
      } catch (err) {
        if (isProductionMode()) throw err;
      }
    }

    let list = [...INITIAL_TENANTS];
    if (options?.status) {
      list = list.filter(t => t.status.toLowerCase() === options.status?.toLowerCase());
    }
    if (options?.applicationId) {
      list = list.filter(t => t.applicationId === options.applicationId);
    }
    if (options?.search) {
      const s = options.search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s));
    }
    return list;
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

      return (members || []).map((m: any) => ({
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
