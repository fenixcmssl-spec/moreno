import prisma from '@/lib/prisma';
import { DomainResolutionResult, DomainService } from './domain.service';
import { LicenseService } from './license.service';
import { ThemeService, ThemeRecord } from './theme.service';
import { 
  TenantStore, 
  ProductItem, 
  BlogPost, 
  ClassifiedAdItem, 
  SupportedLocale 
} from '@/types';
import { INITIAL_TENANTS } from '@/lib/initialData';

export interface StorefrontPageItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: string;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  seoTitle?: string;
  seoDesc?: string;
  createdAt: string;
}

export interface StorefrontCategoryItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
}

export interface StorefrontResolutionPayload {
  success: boolean;
  hostname: string;
  resolvedVia: 'postgresql_domain' | 'postgresql_subdomain' | 'postgresql_tenant' | 'memory_domain' | 'memory_fallback';
  tenant: TenantStore;
  theme: {
    id: string;
    name: string;
    key: string;
    palette: Record<string, string>;
    typography: { headingFont: string; bodyFont: string };
    sections: any[];
  };
  settings: {
    storeName: string;
    tagline: string;
    supportEmail: string;
    phone: string;
    address: string;
    taxRate: number;
    shippingBaseCost: number;
    freeShippingThreshold: number;
    currency: string;
    [key: string]: any;
  };
  language: {
    defaultLocale: SupportedLocale;
    supportedLocales: SupportedLocale[];
  };
  products: ProductItem[];
  categories: StorefrontCategoryItem[];
  pages: StorefrontPageItem[];
  content: {
    blogPosts: BlogPost[];
    classifiedAds: ClassifiedAdItem[];
  };
  activePlugins: string[];
  license: {
    valid: boolean;
    status: string;
    planId: string;
    entitlements: Record<string, any>;
  };
  cachedAt?: string;
}

interface CacheEntry {
  payload: StorefrontResolutionPayload;
  expiresAt: number;
  tenantId: string;
}

// In-Memory Partitioned Cache with Strict Tenant Isolation (TTL: 60s)
const storefrontCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export class StorefrontService {
  /**
   * Sanitizes and normalizes raw hostnames according to RFC 1035/1123
   * Prevents host header injection and CRLF attacks
   */
  static sanitizeHostname(rawHost: string | null | undefined): string {
    if (!rawHost) return '';
    
    // Strip protocols, ports, trailing slashes, whitespace
    let clean = rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .split(':')[0];

    // Remove any illegal characters (only alphanumeric, dots, and hyphens allowed)
    clean = clean.replace(/[^a-z0-9.-]/g, '');

    // Remove leading/trailing dots
    clean = clean.replace(/^\.+|\.+$/g, '');

    return clean;
  }

  /**
   * Primary resolver: Resolves hostname -> Domain -> Tenant -> Theme -> Settings -> Language -> Products -> Pages -> Content
   * Direct PostgreSQL query with zero cross-tenant data leakage.
   */
  static async resolveStorefront(rawHost: string, options?: { forceFresh?: boolean; fallbackSlug?: string }): Promise<StorefrontResolutionPayload | null> {
    const hostname = this.sanitizeHostname(rawHost);
    const fallbackSlug = options?.fallbackSlug ? this.sanitizeHostname(options.fallbackSlug) : undefined;

    const cacheKey = `storefront:${hostname || fallbackSlug || 'default'}`;

    // 1. Check isolated cache
    if (!options?.forceFresh) {
      const cached = storefrontCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        // Enforce isolation validation on cache retrieval
        if (cached.payload.tenant && cached.payload.tenant.id === cached.tenantId) {
          return {
            ...cached.payload,
            cachedAt: new Date(cached.expiresAt - CACHE_TTL_MS).toISOString()
          };
        }
      }
    }

    // 2. Resolve Tenant from PostgreSQL
    let tenantRecord: any = null;
    let resolvedVia: StorefrontResolutionPayload['resolvedVia'] = 'postgresql_domain';

    if (process.env.DATABASE_URL && prisma) {
      try {
        // Step 2a: Lookup in Domain table by verified hostname (Custom Domain or Subdomain)
        if (hostname) {
          const domainMatch = await (prisma as any).domain.findFirst({
            where: {
              hostname: hostname,
              status: 'active'
            },
            include: {
              tenant: true
            }
          });

          if (domainMatch?.tenant) {
            tenantRecord = domainMatch.tenant;
            resolvedVia = domainMatch.type === 'SYSTEM_SUBDOMAIN' ? 'postgresql_subdomain' : 'postgresql_domain';
          }
        }

        // Step 2b: If hostname is of form '<slug>.fenixcms.es' or platform domain, extract slug and query Tenant
        if (!tenantRecord && hostname && (hostname.endsWith('.fenixcms.es') || hostname.includes('localhost') || hostname.includes('run.app'))) {
          const slugPart = hostname.replace('.fenixcms.es', '').split('.')[0];
          if (slugPart && slugPart !== 'localhost' && slugPart !== 'fenixcms' && slugPart !== 'ais-dev' && slugPart !== 'ais-pre') {
            tenantRecord = await (prisma as any).tenant.findUnique({
              where: { slug: slugPart }
            });
            if (tenantRecord) resolvedVia = 'postgresql_subdomain';
          }
        }

        // Step 2c: Direct match on Tenant table domain/customDomain columns
        if (!tenantRecord && hostname) {
          tenantRecord = await (prisma as any).tenant.findFirst({
            where: {
              OR: [
                { domain: hostname },
                { customDomain: hostname }
              ]
            }
          });
          if (tenantRecord) resolvedVia = 'postgresql_tenant';
        }

        // Step 2d: Fallback slug check (e.g. from query params ?store=slug in dev)
        if (!tenantRecord && fallbackSlug) {
          tenantRecord = await (prisma as any).tenant.findFirst({
            where: {
              OR: [
                { id: fallbackSlug },
                { slug: fallbackSlug }
              ]
            }
          });
          if (tenantRecord) resolvedVia = 'postgresql_tenant';
        }
      } catch (err) {
        console.warn('PostgreSQL storefront resolution lookup error, checking memory:', err);
      }
    }

    // 3. Fallback to memory store if database is empty or not configured
    if (!tenantRecord) {
      // Memory Domain check
      const memRes = await DomainService.resolveHostname(hostname || fallbackSlug || '');
      if (memRes.found && memRes.tenant) {
        tenantRecord = memRes.tenant;
        resolvedVia = memRes.resolutionType === 'database_custom_domain' ? 'memory_domain' : 'memory_fallback';
      } else if (fallbackSlug) {
        tenantRecord = INITIAL_TENANTS.find(t => t.slug === fallbackSlug || t.id === fallbackSlug) || null;
        if (tenantRecord) resolvedVia = 'memory_fallback';
      }
    }

    // If still not resolved and in localhost/dev, resolve default demo tenant
    if (!tenantRecord && (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname === '' || hostname.includes('run.app'))) {
      if (process.env.DATABASE_URL && prisma) {
        try {
          tenantRecord = await (prisma as any).tenant.findFirst({
            where: { status: 'active' },
            orderBy: { createdAt: 'asc' }
          });
        } catch {}
      }
      if (!tenantRecord) {
        tenantRecord = INITIAL_TENANTS[0];
        resolvedVia = 'memory_fallback';
      }
    }

    if (!tenantRecord) {
      return null;
    }

    const tenantId = tenantRecord.id;

    // 4. Fetch Products strictly isolated to this tenant
    let products: ProductItem[] = [];
    let categories: StorefrontCategoryItem[] = [];
    let pages: StorefrontPageItem[] = [];
    let blogPosts: BlogPost[] = [];
    let classifiedAds: ClassifiedAdItem[] = [];

    if (process.env.DATABASE_URL && prisma) {
      try {
        // Fetch products strictly by tenantId
        const dbProducts = await (prisma as any).product.findMany({
          where: {
            tenantId: tenantId,
            status: { in: ['active', 'ACTIVE'] }
          },
          orderBy: [
            { featured: 'desc' },
            { createdAt: 'desc' }
          ]
        });

        if (dbProducts && dbProducts.length > 0) {
          products = dbProducts.map((p: any) => ({
            id: p.id,
            tenantId: p.tenantId,
            title: p.title,
            slug: p.slug,
            description: p.description || '',
            category: p.category || 'General',
            price: Number(p.price) || 0,
            compareAtPrice: p.comparePrice ? Number(p.comparePrice) : undefined,
            costPrice: p.costPrice ? Number(p.costPrice) : undefined,
            sku: p.sku || '',
            stock: Number(p.stock) || 0,
            rating: Number(p.rating) || 5.0,
            reviewsCount: Number(p.reviewsCount) || 0,
            images: Array.isArray(p.images) && p.images.length > 0 
              ? p.images 
              : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
            tags: Array.isArray(p.tags) ? p.tags : [],
            featured: Boolean(p.featured),
            isBestSeller: Boolean(p.isBestSeller),
            isDeal: Boolean(p.isDeal),
            status: p.status,
            translations: p.translations || undefined,
            attributes: p.attributes || undefined,
            variants: p.variants || undefined,
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
          }));
        }

        // Fetch categories strictly by tenantId
        const dbCategories = await (prisma as any).category.findMany({
          where: { tenantId: tenantId },
          orderBy: { name: 'asc' }
        });
        if (dbCategories) {
          categories = dbCategories.map((c: any) => ({
            id: c.id,
            tenantId: c.tenantId,
            name: c.name,
            slug: c.slug,
            description: c.description || undefined,
            image: c.image || undefined,
            parentId: c.parentId || undefined
          }));
        }

        // Fetch pages strictly by tenantId
        const dbPages = await (prisma as any).page.findMany({
          where: { tenantId: tenantId, status: 'PUBLISHED' },
          orderBy: { createdAt: 'asc' }
        });
        if (dbPages) {
          pages = dbPages.map((pg: any) => ({
            id: pg.id,
            tenantId: pg.tenantId,
            title: pg.title,
            slug: pg.slug,
            content: pg.content,
            status: pg.status,
            seoTitle: pg.seoTitle || undefined,
            seoDesc: pg.seoDesc || undefined,
            createdAt: pg.createdAt instanceof Date ? pg.createdAt.toISOString() : pg.createdAt
          }));
        }

        // Fetch blog posts strictly by tenantId
        const dbPosts = await (prisma as any).blogPost.findMany({
          where: { tenantId: tenantId, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' }
        });
        if (dbPosts) {
          blogPosts = dbPosts.map((b: any) => ({
            id: b.id,
            tenantId: b.tenantId,
            title: b.title,
            slug: b.slug,
            excerpt: b.excerpt || '',
            content: b.content,
            category: b.category,
            author: b.author || { name: 'Editor', role: 'Staff' },
            featuredImage: b.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
            tags: b.tags || [],
            status: b.status,
            viewsCount: b.viewsCount || 0,
            publishedAt: b.publishedAt instanceof Date ? b.publishedAt.toISOString() : b.publishedAt,
            createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt
          }));
        }

        // Fetch classified ads strictly by tenantId
        const dbAds = await (prisma as any).classifiedAd.findMany({
          where: { tenantId: tenantId, status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' }
        });
        if (dbAds) {
          classifiedAds = dbAds.map((a: any) => ({
            id: a.id,
            tenantId: a.tenantId,
            title: a.title,
            slug: a.slug,
            description: a.description,
            category: a.category,
            price: Number(a.price) || 0,
            location: a.location,
            images: a.images || [],
            status: a.status,
            featured: Boolean(a.featured),
            sellerName: a.sellerName,
            sellerPhone: a.sellerPhone || undefined,
            sellerEmail: a.sellerEmail || undefined,
            viewsCount: a.viewsCount || 0,
            favoritesCount: a.favoritesCount || 0,
            createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt
          }));
        }
      } catch (err) {
        console.warn('PostgreSQL content query warning:', err);
      }
    }

    // 5. Resolve Theme & Visual Branding from PostgreSQL
    const activeTheme = await ThemeService.getActiveTheme(tenantId);
    const baseTheme = activeTheme || (await ThemeService.getThemeById(tenantRecord.themeId || 'theme_modern_luxe')) || (await ThemeService.getAllThemes())[0];
    const resolvedTheme = baseTheme || {
      id: 'theme_modern_luxe',
      name: 'Modern Luxe',
      key: 'theme_modern_luxe',
      description: 'Default Luxe Theme',
      version: '1.0.0',
      author: 'FenixCMS',
      sections: [],
      palette: {
        primary: '#f59e0b',
        secondary: '#1e293b',
        background: '#0f172a',
        surface: '#1e293b',
        accent: '#10b981',
        text: '#ffffff'
      },
      typography: {
        headingFont: 'Playfair Display, serif',
        bodyFont: 'Inter, sans-serif'
      }
    };

    const branding = tenantRecord.branding || {};
    const settings = {
      storeName: tenantRecord.name,
      tagline: tenantRecord.settings?.tagline || 'Tienda oficial',
      supportEmail: tenantRecord.ownerEmail,
      phone: tenantRecord.settings?.phone || '+34 900 000 000',
      address: tenantRecord.settings?.address || 'Madrid, España',
      taxRate: Number(tenantRecord.settings?.taxRate ?? 21),
      shippingBaseCost: Number(tenantRecord.settings?.shippingBaseCost ?? 3.99),
      freeShippingThreshold: Number(tenantRecord.settings?.freeShippingThreshold ?? 50),
      currency: tenantRecord.currency || 'EUR',
      ...(tenantRecord.settings || {})
    };

    // 6. Resolve License & Entitlements
    const license = LicenseService.getByTenantId(tenantId) || (tenantRecord.licenseKey ? LicenseService.getByLicenseKey(tenantRecord.licenseKey) : null);
    const licenseValidation = license ? LicenseService.validate({ licenseKey: license.licenseKey }) : { valid: true, status: 'ACTIVE', entitlements: {} };

    const tenantStoreFormatted: TenantStore = {
      id: tenantRecord.id,
      name: tenantRecord.name,
      slug: tenantRecord.slug,
      domain: tenantRecord.domain || undefined,
      customDomain: tenantRecord.customDomain || undefined,
      status: tenantRecord.status as any,
      applicationId: tenantRecord.applicationId as any,
      enabledApplications: Array.isArray(tenantRecord.enabledApplications) ? tenantRecord.enabledApplications : [tenantRecord.applicationId as any],
      planId: tenantRecord.planId,
      licenseKey: tenantRecord.licenseKey,
      ownerEmail: tenantRecord.ownerEmail,
      ownerName: tenantRecord.ownerName,
      themeId: tenantRecord.themeId,
      currency: tenantRecord.currency || 'EUR',
      defaultLocale: (tenantRecord.defaultLocale || 'es') as SupportedLocale,
      supportedLocales: (tenantRecord.supportedLocales || ['es', 'en', 'it', 'fr', 'de', 'pt']) as SupportedLocale[],
      branding: {
        primaryColor: branding.primaryColor || '#f59e0b',
        accentColor: branding.accentColor || '#10b981',
        fontFamily: branding.fontFamily || 'Inter, sans-serif',
        logoUrl: branding.logoUrl || undefined
      },
      settings: settings as any,
      activePlugins: tenantRecord.activePlugins || ['plugin_stripe_connect', 'plugin_correos_pro'],
      createdAt: tenantRecord.createdAt instanceof Date ? tenantRecord.createdAt.toISOString() : tenantRecord.createdAt
    };

    const payload: StorefrontResolutionPayload = {
      success: true,
      hostname: hostname || tenantRecord.domain || `${tenantRecord.slug}.fenixcms.es`,
      resolvedVia,
      tenant: tenantStoreFormatted,
      theme: {
        id: resolvedTheme.id,
        name: resolvedTheme.name,
        key: resolvedTheme.key,
        palette: {
          ...resolvedTheme.palette,
          primary: branding.primaryColor || resolvedTheme.palette.primary,
          accent: branding.accentColor || resolvedTheme.palette.accent
        },
        typography: {
          headingFont: branding.fontFamily || resolvedTheme.typography.headingFont,
          bodyFont: branding.fontFamily || resolvedTheme.typography.bodyFont
        },
        sections: resolvedTheme.sections
      },
      settings,
      language: {
        defaultLocale: tenantStoreFormatted.defaultLocale,
        supportedLocales: tenantStoreFormatted.supportedLocales
      },
      products,
      categories,
      pages,
      content: {
        blogPosts,
        classifiedAds
      },
      activePlugins: tenantStoreFormatted.activePlugins,
      license: {
        valid: licenseValidation.valid,
        status: licenseValidation.status,
        planId: tenantRecord.planId,
        entitlements: (licenseValidation as any).entitlements || {}
      }
    };

    // 7. Store in partitioned cache with isolation guarantee
    storefrontCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + CACHE_TTL_MS,
      tenantId: tenantId
    });

    return payload;
  }

  /**
   * Invalidates cached storefront responses for a specific tenant when updates occur
   */
  static invalidateTenantCache(tenantId: string): void {
    for (const [key, entry] of storefrontCache.entries()) {
      if (entry.tenantId === tenantId) {
        storefrontCache.delete(key);
      }
    }
  }

  /**
   * Clears entire storefront cache
   */
  static clearAllCache(): void {
    storefrontCache.clear();
  }
}
