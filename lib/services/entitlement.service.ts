import { prisma } from '@/lib/prisma';
import { PlanEntitlements } from '@/types';
import { INITIAL_TENANTS, INITIAL_PLANS, INITIAL_PRODUCTS, INITIAL_BLOG_POSTS, INITIAL_CLASSIFIED_ADS } from '@/lib/initialData';

export interface EntitlementCheckResult {
  allowed: boolean;
  resource: string;
  current: number;
  limit: number;
  remaining: number;
  reason?: string;
}

export interface EffectiveEntitlements {
  tenantId: string;
  tenantSlug: string;
  planId: string;
  planName: string;
  licenseStatus: string;
  isLicenseActive: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  rawEntitlements: Record<string, any>;
  overrides: Record<string, any>;
}

export class EntitlementService {
  /**
   * Resource key normalization mapping
   */
  private static readonly RESOURCE_MAP: Record<string, string> = {
    products: 'products.max',
    'products.max': 'products.max',
    orders: 'orders.max',
    'orders.max': 'orders.max',
    users: 'users.max',
    'users.max': 'users.max',
    members: 'users.max',
    domains: 'domains.max',
    'domains.max': 'domains.max',
    storage: 'storage.max_mb',
    'storage.max_mb': 'storage.max_mb',
    storage_mb: 'storage.max_mb',
    posts: 'blog.posts_max',
    'blog.posts_max': 'blog.posts_max',
    blog_posts: 'blog.posts_max',
    ads: 'classifieds.ads_max',
    'classifieds.ads_max': 'classifieds.ads_max',
    classified_ads: 'classifieds.ads_max',
    categories: 'categories.max',
    'categories.max': 'categories.max',
    coupons: 'coupons.max',
    'coupons.max': 'coupons.max',
    plugins: 'plugins.max',
    'plugins.max': 'plugins.max',
    webhooks: 'webhooks.max',
    'webhooks.max': 'webhooks.max',
    api_requests: 'api.requests_per_day',
    'api.requests_per_day': 'api.requests_per_day'
  };

  /**
   * Feature key normalization mapping
   */
  private static readonly FEATURE_MAP: Record<string, string> = {
    plugins: 'plugins.enabled',
    'plugins.enabled': 'plugins.enabled',
    themes: 'themes.enabled',
    'themes.enabled': 'themes.enabled',
    customTheme: 'customTheme.enabled',
    'customTheme.enabled': 'customTheme.enabled',
    customDomain: 'customDomain.enabled',
    'customDomain.enabled': 'customDomain.enabled',
    analytics: 'analytics.enabled',
    'analytics.enabled': 'analytics.enabled',
    seo: 'seo.enabled',
    'seo.enabled': 'seo.enabled',
    blog: 'blog.enabled',
    'blog.enabled': 'blog.enabled',
    ads: 'ads.enabled',
    'ads.enabled': 'ads.enabled',
    api: 'api.enabled',
    'api.enabled': 'api.enabled',
    webhooks: 'webhooks.enabled',
    'webhooks.enabled': 'webhooks.enabled',
    ai: 'ai.enabled',
    'ai.enabled': 'ai.enabled',
    coupons: 'coupons.enabled',
    'coupons.enabled': 'coupons.enabled',
    multilingual: 'multilingual.enabled',
    'multilingual.enabled': 'multilingual.enabled',
    export: 'export.enabled',
    'export.enabled': 'export.enabled',
    auctions: 'auctions.enabled',
    'auctions.enabled': 'auctions.enabled',
    booking: 'booking.enabled',
    'booking.enabled': 'booking.enabled'
  };

  /**
   * Resolves a full tenant record with license, subscription and plan info
   */
  private static async resolveTenantContext(tenantIdOrSlugOrObject: string | any): Promise<{
    tenant: any | null;
    license: any | null;
    subscription: any | null;
    plan: any | null;
    planEntitlements: Record<string, any>;
    overrides: Record<string, any>;
    isTenantActive: boolean;
    isLicenseActive: boolean;
  }> {
    if (!tenantIdOrSlugOrObject) {
      return {
        tenant: null,
        license: null,
        subscription: null,
        plan: null,
        planEntitlements: {},
        overrides: {},
        isTenantActive: false,
        isLicenseActive: false
      };
    }

    let tenantId = typeof tenantIdOrSlugOrObject === 'string' 
      ? tenantIdOrSlugOrObject.trim() 
      : tenantIdOrSlugOrObject.id || tenantIdOrSlugOrObject.slug;

    let dbTenant: any = null;

    try {
      if (process.env.DATABASE_URL && prisma?.tenant) {
        dbTenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { id: tenantId },
              { slug: tenantId.toLowerCase() },
              { licenseKey: tenantId }
            ]
          },
          include: {
            licenses: {
              include: {
                plan: {
                  include: {
                    entitlements: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            subscriptions: {
              include: {
                plan: {
                  include: {
                    entitlements: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }
    } catch (err) {
      console.warn('EntitlementService: Prisma tenant query notice:', err);
    }

    // Fallback if not in database
    if (!dbTenant && typeof tenantIdOrSlugOrObject === 'object' && tenantIdOrSlugOrObject.id) {
      dbTenant = tenantIdOrSlugOrObject;
    } else if (!dbTenant) {
      const fallback = INITIAL_TENANTS.find(t => t.id === tenantId || t.slug.toLowerCase() === tenantId.toLowerCase());
      if (fallback) {
        dbTenant = {
          ...fallback,
          settings: fallback.settings || {}
        };
      }
    }

    if (!dbTenant) {
      return {
        tenant: null,
        license: null,
        subscription: null,
        plan: null,
        planEntitlements: {},
        overrides: {},
        isTenantActive: false,
        isLicenseActive: false
      };
    }

    // Check Tenant Status (DENY BY DEFAULT if suspended/expired/archived)
    const rawStatus = (dbTenant.status || '').toLowerCase();
    const isTenantActive = rawStatus === 'active' || rawStatus === 'trial';

    // Find active license or subscription
    const licenses = Array.isArray(dbTenant.licenses) ? dbTenant.licenses : [];
    const subscriptions = Array.isArray(dbTenant.subscriptions) ? dbTenant.subscriptions : [];

    const now = new Date();
    const activeLicense = licenses.find((l: any) => {
      const status = (l.status || '').toUpperCase();
      const isActiveStatus = status === 'ACTIVE' || status === 'TRIAL';
      const isNotExpired = !l.expiresAt || new Date(l.expiresAt) > now;
      return isActiveStatus && isNotExpired;
    }) || licenses[0] || null;

    const activeSubscription = subscriptions.find((s: any) => {
      const status = (s.status || '').toUpperCase();
      const isActiveStatus = status === 'ACTIVE' || status === 'TRIALING';
      const isNotExpired = !s.currentPeriodEnd || new Date(s.currentPeriodEnd) > now;
      return isActiveStatus && isNotExpired;
    }) || subscriptions[0] || null;

    let isLicenseActive = false;
    if (activeLicense) {
      const status = (activeLicense.status || '').toUpperCase();
      isLicenseActive = (status === 'ACTIVE' || status === 'TRIAL') && (!activeLicense.expiresAt || new Date(activeLicense.expiresAt) > now);
    } else if (activeSubscription) {
      const status = (activeSubscription.status || '').toUpperCase();
      isLicenseActive = (status === 'ACTIVE' || status === 'TRIALING') && (!activeSubscription.currentPeriodEnd || new Date(activeSubscription.currentPeriodEnd) > now);
    } else if (isTenantActive && dbTenant.licenseKey) {
      // Default dev active license key
      isLicenseActive = true;
    }

    // Resolve Plan and Plan Entitlements
    let plan = activeLicense?.plan || activeSubscription?.plan || null;
    let planId = plan?.id || dbTenant.planId;

    if (!plan && planId) {
      if (process.env.DATABASE_URL && prisma?.plan) {
        try {
          plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: { entitlements: true }
          });
        } catch {
          // Continue
        }
      }
      if (!plan) {
        plan = INITIAL_PLANS.find(p => p.id === planId) || null;
      }
    }

    const planEntitlements: Record<string, any> = {};
    if (plan?.entitlements) {
      if (Array.isArray(plan.entitlements)) {
        for (const ent of plan.entitlements) {
          if (ent.type === 'NUMBER') {
            planEntitlements[ent.key] = Number(ent.value);
          } else if (ent.type === 'BOOLEAN') {
            planEntitlements[ent.key] = ent.value === 'true' || ent.value === '1';
          } else if (ent.type === 'ARRAY') {
            try {
              planEntitlements[ent.key] = JSON.parse(ent.value);
            } catch {
              planEntitlements[ent.key] = [ent.value];
            }
          } else {
            planEntitlements[ent.key] = ent.value;
          }
        }
      } else if (typeof plan.entitlements === 'object') {
        Object.assign(planEntitlements, plan.entitlements);
      }
    }

    // Extract Overrides from tenant.settings
    const settings = typeof dbTenant.settings === 'object' && dbTenant.settings !== null ? dbTenant.settings : {};
    const overrides = settings.overrides || settings.entitlements || settings.entitlementOverrides || {};

    return {
      tenant: dbTenant,
      license: activeLicense,
      subscription: activeSubscription,
      plan,
      planEntitlements,
      overrides,
      isTenantActive,
      isLicenseActive
    };
  }

  /**
   * CAN: Determines whether a tenant has permission for a specific boolean feature
   * STRICT RULE: DENY BY DEFAULT
   * Never missing => true! If missing, returns false.
   */
  static async can(tenantIdOrSlug: string | any, feature: string): Promise<boolean> {
    const context = await this.resolveTenantContext(tenantIdOrSlug);

    // DENY BY DEFAULT: Tenant must exist, be active, and have valid license/subscription
    if (!context.tenant || !context.isTenantActive || !context.isLicenseActive) {
      return false;
    }

    const normalizedFeature = this.FEATURE_MAP[feature] || feature;

    // 1. Check Explicit Tenant Overrides (Highest priority)
    if (context.overrides && normalizedFeature in context.overrides) {
      const overrideVal = context.overrides[normalizedFeature];
      return Boolean(overrideVal === true || overrideVal === 'true' || overrideVal === 1);
    }

    // 2. Check Action Permissions (e.g. 'products:create' checks if remaining products > 0)
    if (normalizedFeature.endsWith(':create')) {
      const resourceKey = normalizedFeature.split(':')[0];
      const remaining = await this.remaining(tenantIdOrSlug, resourceKey);
      return remaining > 0;
    }

    // 3. Check Special Domain Feature: customDomain.enabled -> also true if domains.max > 0
    if (normalizedFeature === 'customDomain.enabled') {
      if (context.planEntitlements['customDomain.enabled'] !== undefined) {
        return Boolean(context.planEntitlements['customDomain.enabled'] === true);
      }
      const domainsMax = Number(context.planEntitlements['domains.max'] ?? 0);
      return domainsMax > 0;
    }

    // 4. Check Plan Entitlements
    if (normalizedFeature in context.planEntitlements) {
      const val = context.planEntitlements[normalizedFeature];
      return Boolean(val === true || val === 'true' || val === 1);
    }

    // 5. DENY BY DEFAULT: Missing feature key is ALWAYS false
    return false;
  }

  /**
   * LIMIT: Returns the maximum numerical quota allowed for a given resource
   * STRICT RULE: DENY BY DEFAULT
   * Never missing => unlimited! If missing, returns 0.
   */
  static async limit(tenantIdOrSlug: string | any, resource: string): Promise<number> {
    const context = await this.resolveTenantContext(tenantIdOrSlug);

    // DENY BY DEFAULT: Tenant must exist, be active, and have valid license/subscription
    if (!context.tenant || !context.isTenantActive || !context.isLicenseActive) {
      return 0;
    }

    const normalizedResource = this.RESOURCE_MAP[resource] || resource;

    // 1. Check Explicit Tenant Overrides (Highest priority)
    if (context.overrides && normalizedResource in context.overrides) {
      const overrideVal = Number(context.overrides[normalizedResource]);
      return isNaN(overrideVal) ? 0 : Math.max(0, overrideVal);
    }

    // 2. Check Plan Entitlements
    if (normalizedResource in context.planEntitlements) {
      const rawVal = context.planEntitlements[normalizedResource];
      const parsed = Number(rawVal);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    // 3. Fallback Plan Model direct properties if entitlement record wasn't loaded
    if (context.plan) {
      if (normalizedResource === 'products.max' && context.plan.maxProducts !== undefined) {
        return Number(context.plan.maxProducts);
      }
      if (normalizedResource === 'storage.max_mb' && context.plan.maxStorageMb !== undefined) {
        return Number(context.plan.maxStorageMb);
      }
    }

    // 4. DENY BY DEFAULT: Missing numerical limit is ALWAYS 0 (never unlimited)
    return 0;
  }

  /**
   * Current Usage: Counts live resources in PostgreSQL for the tenant
   */
  static async getUsage(tenantIdOrSlug: string | any, resource: string): Promise<number> {
    const context = await this.resolveTenantContext(tenantIdOrSlug);
    if (!context.tenant) {
      return 0;
    }

    const tenantId = context.tenant.id;
    const normalizedResource = this.RESOURCE_MAP[resource] || resource;

    try {
      if (process.env.DATABASE_URL && prisma) {
        switch (normalizedResource) {
          case 'products.max':
            if (prisma.product) {
              return await prisma.product.count({ where: { tenantId } });
            }
            break;

          case 'orders.max':
            if (prisma.order) {
              return await prisma.order.count({ where: { tenantId } });
            }
            break;

          case 'users.max':
            if (prisma.tenantMembership) {
              return await prisma.tenantMembership.count({ where: { tenantId } });
            }
            break;

          case 'domains.max':
            if (prisma.domain) {
              return await prisma.domain.count({ where: { tenantId } });
            }
            break;

          case 'storage.max_mb':
            if (prisma.mediaAsset) {
              const agg = await prisma.mediaAsset.aggregate({
                where: { tenantId },
                _sum: { sizeBytes: true }
              });
              const bytes = agg._sum?.sizeBytes || 0;
              return Math.ceil(bytes / (1024 * 1024));
            }
            break;

          case 'blog.posts_max':
            if (prisma.blogPost) {
              return await prisma.blogPost.count({ where: { tenantId } });
            }
            break;

          case 'classifieds.ads_max':
            if (prisma.classifiedAd) {
              return await prisma.classifiedAd.count({ where: { tenantId } });
            }
            break;

          case 'categories.max':
            if (prisma.category) {
              return await prisma.category.count({ where: { tenantId } });
            }
            break;

          case 'coupons.max':
            if (prisma.coupon) {
              return await prisma.coupon.count({ where: { tenantId } });
            }
            break;

          case 'plugins.max':
            if (prisma.pluginInstallation) {
              return await prisma.pluginInstallation.count({ where: { tenantId, status: 'ACTIVE' } });
            }
            return (context.tenant.activePlugins || []).length;
        }
      }
    } catch (err) {
      console.warn('EntitlementService: getUsage DB query warning, falling back to local store:', err);
    }

    // Memory / mock fallback
    switch (normalizedResource) {
      case 'products.max':
        return INITIAL_PRODUCTS.filter(p => p.tenantId === tenantId).length;
      case 'blog.posts_max':
        return INITIAL_BLOG_POSTS.filter(p => p.tenantId === tenantId).length;
      case 'classifieds.ads_max':
        return INITIAL_CLASSIFIED_ADS.filter(p => p.tenantId === tenantId).length;
      case 'plugins.max':
        return (context.tenant.activePlugins || []).length;
      default:
        return 0;
    }
  }

  /**
   * REMAINING: Returns the available remaining capacity for a given resource
   * remaining = max(0, limit - currentUsage)
   */
  static async remaining(tenantIdOrSlug: string | any, resource: string): Promise<number> {
    const maxLimit = await this.limit(tenantIdOrSlug, resource);
    if (maxLimit <= 0) {
      return 0;
    }

    const currentUsage = await this.getUsage(tenantIdOrSlug, resource);
    return Math.max(0, maxLimit - currentUsage);
  }

  /**
   * Check Resource: Comprehensive verification with details and human-readable feedback
   */
  static async checkResource(
    tenantIdOrSlug: string | any,
    resource: string,
    additionalAmount: number = 1
  ): Promise<EntitlementCheckResult> {
    const context = await this.resolveTenantContext(tenantIdOrSlug);

    if (!context.tenant) {
      return {
        allowed: false,
        resource,
        current: 0,
        limit: 0,
        remaining: 0,
        reason: 'El tenant especificado no existe o no pudo ser identificado.'
      };
    }

    if (!context.isTenantActive) {
      return {
        allowed: false,
        resource,
        current: 0,
        limit: 0,
        remaining: 0,
        reason: `El tenant '${context.tenant.name}' se encuentra suspendido o inactivo. Contacta con soporte.`
      };
    }

    if (!context.isLicenseActive) {
      return {
        allowed: false,
        resource,
        current: 0,
        limit: 0,
        remaining: 0,
        reason: 'Tu licencia o suscripción no está activa o ha expirado. Renueva tu suscripción para continuar.'
      };
    }

    const maxLimit = await this.limit(tenantIdOrSlug, resource);
    const current = await this.getUsage(tenantIdOrSlug, resource);
    const remaining = Math.max(0, maxLimit - current);
    const allowed = (current + additionalAmount) <= maxLimit;

    let reason: string | undefined = undefined;
    if (!allowed) {
      reason = `Límite alcanzado para '${resource}'. Tu plan permite un máximo de ${maxLimit} (actual: ${current}). Actualiza tu plan para ampliar la cuota.`;
    }

    return {
      allowed,
      resource,
      current,
      limit: maxLimit,
      remaining,
      reason
    };
  }

  /**
   * Asserts that a boolean feature is allowed; throws an error with code 403 if denied
   */
  static async assertCan(tenantIdOrSlug: string | any, feature: string): Promise<void> {
    const isAllowed = await this.can(tenantIdOrSlug, feature);
    if (!isAllowed) {
      const error: any = new Error(`Acceso denegado: La función '${feature}' no está habilitada en tu plan de suscripción actual.`);
      error.statusCode = 403;
      error.code = 'ENTITLEMENT_FORBIDDEN';
      error.feature = feature;
      throw error;
    }
  }

  /**
   * Asserts that resource creation is allowed; throws an error with code 403 if quota is exceeded
   */
  static async assertCanCreate(tenantIdOrSlug: string | any, resource: string, amount: number = 1): Promise<void> {
    const check = await this.checkResource(tenantIdOrSlug, resource, amount);
    if (!check.allowed) {
      const error: any = new Error(check.reason || `Has superado el límite de ${check.limit} para el recurso '${resource}'.`);
      error.statusCode = 403;
      error.code = 'ENTITLEMENT_LIMIT_EXCEEDED';
      error.resource = resource;
      error.limit = check.limit;
      error.current = check.current;
      error.remaining = check.remaining;
      throw error;
    }
  }

  /**
   * Retrieves all effective entitlements (Plan + Overrides) for a tenant
   */
  static async getEffectiveEntitlements(tenantIdOrSlug: string | any): Promise<EffectiveEntitlements> {
    const context = await this.resolveTenantContext(tenantIdOrSlug);

    const features: Record<string, boolean> = {};
    const limits: Record<string, number> = {};
    const rawEntitlements: Record<string, any> = {
      ...context.planEntitlements,
      ...context.overrides
    };

    // Standard features to resolve
    const standardFeatures = [
      'plugins.enabled',
      'themes.enabled',
      'customTheme.enabled',
      'customDomain.enabled',
      'analytics.enabled',
      'seo.enabled',
      'blog.enabled',
      'ads.enabled',
      'api.enabled',
      'webhooks.enabled',
      'ai.enabled',
      'coupons.enabled',
      'multilingual.enabled',
      'export.enabled',
      'auctions.enabled',
      'booking.enabled'
    ];

    for (const f of standardFeatures) {
      features[f] = context.isTenantActive && context.isLicenseActive 
        ? (context.overrides[f] !== undefined ? Boolean(context.overrides[f]) : Boolean(context.planEntitlements[f]))
        : false;
    }

    // Standard limits to resolve
    const standardResources = [
      'products.max',
      'orders.max',
      'users.max',
      'domains.max',
      'storage.max_mb',
      'blog.posts_max',
      'classifieds.ads_max',
      'categories.max',
      'coupons.max',
      'plugins.max',
      'webhooks.max',
      'api.requests_per_day'
    ];

    for (const r of standardResources) {
      limits[r] = context.isTenantActive && context.isLicenseActive
        ? (context.overrides[r] !== undefined ? Number(context.overrides[r]) : Number(context.planEntitlements[r] ?? 0))
        : 0;
    }

    return {
      tenantId: context.tenant?.id || '',
      tenantSlug: context.tenant?.slug || '',
      planId: context.plan?.id || context.tenant?.planId || '',
      planName: context.plan?.name || 'Standard Plan',
      licenseStatus: context.license?.status || 'INACTIVE',
      isLicenseActive: context.isLicenseActive,
      features,
      limits,
      rawEntitlements,
      overrides: context.overrides
    };
  }

  /**
   * Sets an explicit tenant-level entitlement override in PostgreSQL
   */
  static async setOverride(tenantIdOrSlug: string, key: string, value: string | number | boolean): Promise<any> {
    if (!prisma?.tenant) {
      throw new Error('Database connection not available to set override');
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: tenantIdOrSlug },
          { slug: tenantIdOrSlug.toLowerCase() }
        ]
      }
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantIdOrSlug}' no encontrado.`);
    }

    const currentSettings = typeof tenant.settings === 'object' && tenant.settings !== null ? (tenant.settings as any) : {};
    const currentOverrides = currentSettings.overrides || currentSettings.entitlements || {};

    const updatedOverrides = {
      ...currentOverrides,
      [key]: value
    };

    const updatedSettings = {
      ...currentSettings,
      overrides: updatedOverrides
    };

    return await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: updatedSettings
      }
    });
  }

  /**
   * Removes an explicit tenant-level entitlement override in PostgreSQL
   */
  static async removeOverride(tenantIdOrSlug: string, key: string): Promise<any> {
    if (!prisma?.tenant) {
      throw new Error('Database connection not available to remove override');
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: tenantIdOrSlug },
          { slug: tenantIdOrSlug.toLowerCase() }
        ]
      }
    });

    if (!tenant) {
      throw new Error(`Tenant '${tenantIdOrSlug}' no encontrado.`);
    }

    const currentSettings = typeof tenant.settings === 'object' && tenant.settings !== null ? (tenant.settings as any) : {};
    const currentOverrides = { ...(currentSettings.overrides || currentSettings.entitlements || {}) };

    delete currentOverrides[key];

    const updatedSettings = {
      ...currentSettings,
      overrides: currentOverrides
    };

    return await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: updatedSettings
      }
    });
  }

  // =========================================================================
  // Legacy compatibility helpers
  // =========================================================================
  static getTenantEntitlements(planEntitlements?: PlanEntitlements): PlanEntitlements {
    return {
      'products.max': 100,
      'storage.max_mb': 1000,
      'domains.max': 1,
      'users.max': 1,
      'ai.enabled': false,
      'plugins.allowed': ['plugin_correos_pro', 'plugin_stripe_connect', 'plugin_seo_pro', 'plugin_fenix_all_import'],
      'customTheme.enabled': false,
      'customDomain.enabled': false,
      'analytics.enabled': false,
      'seo.enabled': true,
      'blog.enabled': true,
      'blog.posts_max': 50,
      'ads.enabled': false,
      'classifieds.ads_max': 0,
      'api.enabled': false,
      'webhooks.enabled': false,
      ...(planEntitlements || {})
    };
  }

  static isFeatureEnabled(entitlements: PlanEntitlements = {}, featureKey: string): boolean {
    if (!entitlements || typeof entitlements !== 'object') {
      return false;
    }
    return Boolean(entitlements[featureKey] === true);
  }

  static canCreateResource(
    entitlements: PlanEntitlements = {},
    resourceKey: 'products' | 'posts' | 'ads' | 'domains' | 'users' | 'storage',
    currentUsage: number,
    additionalAmount: number = 1
  ): { allowed: boolean; maxAllowed: number; currentUsage: number; message?: string } {
    let limitKey: keyof PlanEntitlements = 'products.max';
    switch (resourceKey) {
      case 'products': limitKey = 'products.max'; break;
      case 'posts': limitKey = 'blog.posts_max'; break;
      case 'ads': limitKey = 'classifieds.ads_max'; break;
      case 'domains': limitKey = 'domains.max'; break;
      case 'users': limitKey = 'users.max'; break;
      case 'storage': limitKey = 'storage.max_mb'; break;
    }

    const rawVal = entitlements[limitKey];
    const maxAllowed = typeof rawVal === 'number' ? rawVal : 0;
    const isAllowed = (currentUsage + additionalAmount) <= maxAllowed;

    return {
      allowed: isAllowed,
      maxAllowed,
      currentUsage,
      message: isAllowed ? undefined : `Has alcanzado el límite de ${maxAllowed} para ${resourceKey} en tu plan actual. Actualiza tu suscripción para ampliar la cuota.`
    };
  }

  static isPluginAllowed(entitlements: PlanEntitlements = {}, pluginKey: string): boolean {
    const allowed: any = entitlements['plugins.allowed'];
    if (!allowed) return false;
    if (typeof allowed === 'string' && (allowed === '*' || allowed === 'all')) return true;
    if (Array.isArray(allowed)) {
      return allowed.includes(pluginKey) || allowed.includes('*');
    }
    return false;
  }
}
