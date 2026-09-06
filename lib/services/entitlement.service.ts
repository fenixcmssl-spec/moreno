import { PlanEntitlements } from '@/types';

export class EntitlementService {
  /**
   * Resolves unified entitlements for a tenant combining plan limits and addon overrides
   */
  static getTenantEntitlements(planEntitlements?: PlanEntitlements): PlanEntitlements {
    const defaults: PlanEntitlements = {
      'products.max': 1000,
      'storage.max_mb': 5000,
      'domains.max': 1,
      'users.max': 3,
      'ai.enabled': true,
      'plugins.allowed': ['plugin_correos_pro', 'plugin_stripe_connect', 'plugin_seo_pro', 'plugin_multi_currency'],
      'customTheme.enabled': true,
      'blog.posts_max': 500,
      'classifieds.ads_max': 500
    };

    return {
      ...defaults,
      ...(planEntitlements || {})
    };
  }

  /**
   * Validates if a resource creation is allowed under current license limits
   */
  static canCreateResource(
    entitlements: PlanEntitlements,
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

    const maxAllowed = (typeof entitlements[limitKey] === 'number' ? entitlements[limitKey] : 999999) as number;
    const isAllowed = (currentUsage + additionalAmount) <= maxAllowed;

    return {
      allowed: isAllowed,
      maxAllowed,
      currentUsage,
      message: isAllowed ? undefined : `Has alcanzado el límite de ${maxAllowed} para ${resourceKey} en tu plan actual.`
    };
  }

  /**
   * Validates if a plugin is authorized to be installed under current plan
   */
  static isPluginAllowed(entitlements: PlanEntitlements, pluginKey: string): boolean {
    const allowed: any = entitlements['plugins.allowed'];
    if (!allowed) return true;
    if (allowed === '*' || allowed === 'all') return true;
    if (Array.isArray(allowed)) {
      return allowed.includes(pluginKey) || allowed.includes('*');
    }
    return true;
  }
}
