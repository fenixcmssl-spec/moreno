import { PlanEntitlements } from '@/types';

export class EntitlementService {
  /**
   * Resolves unified entitlements for a tenant combining plan limits and addon overrides
   * DENY BY DEFAULT architecture: features must be explicitly allowed.
   */
  static getTenantEntitlements(planEntitlements?: PlanEntitlements): PlanEntitlements {
    const baseSafeMinimums: PlanEntitlements = {
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
      'webhooks.enabled': false
    };

    return {
      ...baseSafeMinimums,
      ...(planEntitlements || {})
    };
  }

  /**
   * Checks if a boolean entitlement feature is permitted.
   * STRICT DENY BY DEFAULT: undefined or falsy => false.
   */
  static isFeatureEnabled(entitlements: PlanEntitlements = {}, featureKey: string): boolean {
    if (!entitlements || typeof entitlements !== 'object') {
      return false;
    }
    return Boolean(entitlements[featureKey] === true);
  }

  /**
   * Validates if a resource creation is allowed under current license limits
   */
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

    // DENY BY DEFAULT: if limitKey is missing/undefined, default to strict 0 (blocked)
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

  /**
   * Validates if a plugin is authorized to be installed under current plan
   * DENY BY DEFAULT: only allowed plugins or explicit wildcard can be enabled
   */
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

