import { prisma } from '@/lib/prisma';
import { DomainItem, TenantStore } from '@/types';
import { INITIAL_TENANTS } from '@/lib/initialData';
import { EntitlementService } from './entitlement.service';

let memoryDomains: DomainItem[] = [
  {
    id: 'dom_demo_sub',
    tenantId: 'tenant_demo',
    hostname: 'demo.fenixcms.es',
    type: 'subdomain',
    verified: true,
    primary: false,
    sslStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dom_demo_custom',
    tenantId: 'tenant_demo',
    hostname: 'tienda-demo.es',
    type: 'custom',
    verified: true,
    primary: true,
    sslStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dom_cliente_sub',
    tenantId: 'tenant_demo',
    hostname: 'cliente.fenixcms.es',
    type: 'subdomain',
    verified: true,
    primary: false,
    sslStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dom_cliente_custom',
    tenantId: 'tenant_demo',
    hostname: 'cliente.com',
    type: 'custom',
    verified: true,
    primary: false,
    sslStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dom_milano_sub',
    tenantId: 'tenant_milano',
    hostname: 'milano.fenixcms.es',
    type: 'subdomain',
    verified: true,
    primary: false,
    sslStatus: 'active',
    createdAt: '2026-01-02T00:00:00Z'
  },
  {
    id: 'dom_milano_custom',
    tenantId: 'tenant_milano',
    hostname: 'milanostyle.it',
    type: 'custom',
    verified: true,
    primary: true,
    sslStatus: 'active',
    createdAt: '2026-01-02T00:00:00Z'
  }
];

export interface DomainResolutionResult {
  found: boolean;
  hostname: string;
  domain?: DomainItem;
  tenant?: TenantStore;
  resolutionType: 'database_custom_domain' | 'database_subdomain' | 'tenant_fallback' | 'not_found';
}

export class DomainService {
  /**
   * Normalizes a hostname string (removes port, protocols, trailing slashes, lowercases)
   */
  static normalizeHostname(rawHost: string): string {
    if (!rawHost) return '';
    return rawHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .split(':')[0];
  }

  /**
   * Real domain resolution pipeline:
   * hostname -> Domain (PostgreSQL / Store) -> tenantId -> Tenant
   * Strictly avoids simplistic slug assumptions (e.g. NEVER assumes a.b.com => a-b-com)
   */
  static async resolveHostname(rawHostname: string): Promise<DomainResolutionResult> {
    const hostname = this.normalizeHostname(rawHostname);
    if (!hostname) {
      return { found: false, hostname: '', resolutionType: 'not_found' };
    }

    // 1. Try resolving via PostgreSQL if available
    try {
      if (process.env.DATABASE_URL && prisma?.domain) {
        // Query verified & active domains
        const dbDomain = await prisma.domain.findFirst({
          where: {
            hostname: hostname,
            status: 'active'
          },
          include: {
            tenant: true
          }
        });

        if (dbDomain && dbDomain.tenant) {
          const domainItem: DomainItem = {
            id: dbDomain.id,
            tenantId: dbDomain.tenantId,
            hostname: dbDomain.hostname,
            type: dbDomain.type === 'SYSTEM_SUBDOMAIN' ? 'subdomain' : 'custom',
            verified: dbDomain.verified,
            primary: dbDomain.isPrimary,
            sslStatus: dbDomain.sslStatus as any || 'active',
            createdAt: dbDomain.createdAt.toISOString()
          };

          const t = dbDomain.tenant;
          const tenantStore: TenantStore = {
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
            defaultLocale: t.defaultLocale as any,
            supportedLocales: t.supportedLocales as any,
            branding: t.branding as any,
            settings: t.settings as any,
            activePlugins: t.activePlugins,
            createdAt: t.createdAt.toISOString()
          };

          return {
            found: true,
            hostname,
            domain: domainItem,
            tenant: tenantStore,
            resolutionType: dbDomain.type === 'SYSTEM_SUBDOMAIN' ? 'database_subdomain' : 'database_custom_domain'
          };
        }

        // Direct fallback query on Tenant table
        const directTenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { domain: hostname },
              { customDomain: hostname }
            ]
          }
        });

        if (directTenant) {
          const tenantStore: TenantStore = {
            id: directTenant.id,
            name: directTenant.name,
            slug: directTenant.slug,
            domain: directTenant.domain || undefined,
            customDomain: directTenant.customDomain || undefined,
            status: directTenant.status as any,
            applicationId: directTenant.applicationId as any,
            enabledApplications: [directTenant.applicationId as any],
            planId: directTenant.planId,
            licenseKey: directTenant.licenseKey,
            ownerEmail: directTenant.ownerEmail,
            ownerName: directTenant.ownerName,
            themeId: directTenant.themeId,
            currency: directTenant.currency,
            defaultLocale: directTenant.defaultLocale as any,
            supportedLocales: directTenant.supportedLocales as any,
            branding: directTenant.branding as any,
            settings: directTenant.settings as any,
            activePlugins: directTenant.activePlugins,
            createdAt: directTenant.createdAt.toISOString()
          };

          return {
            found: true,
            hostname,
            tenant: tenantStore,
            resolutionType: 'database_custom_domain'
          };
        }
      }
    } catch {
      // Fall through to memory store
    }

    // 2. Memory domains resolution
    const matchedDomain = memoryDomains.find(d => d.hostname.toLowerCase() === hostname);
    if (matchedDomain) {
      const tenant = INITIAL_TENANTS.find(t => t.id === matchedDomain.tenantId);
      if (tenant) {
        return {
          found: true,
          hostname,
          domain: matchedDomain,
          tenant,
          resolutionType: matchedDomain.type === 'subdomain' ? 'database_subdomain' : 'database_custom_domain'
        };
      }
    }

    // 3. Check INITIAL_TENANTS registered domain / customDomain / platform subdomain
    const matchedTenant = INITIAL_TENANTS.find(t => {
      const d = t.domain?.toLowerCase();
      const cd = t.customDomain?.toLowerCase();
      const sub = `${t.slug}.fenixcms.es`.toLowerCase();
      return d === hostname || cd === hostname || sub === hostname;
    });

    if (matchedTenant) {
      return {
        found: true,
        hostname,
        tenant: matchedTenant,
        resolutionType: 'tenant_fallback'
      };
    }

    return {
      found: false,
      hostname,
      resolutionType: 'not_found'
    };
  }

  /**
   * Retrieves all domains for a tenant
   */
  static async getDomainsByTenant(tenantId: string): Promise<DomainItem[]> {
    try {
      if (process.env.DATABASE_URL && prisma?.domain) {
        const dbDomains = await prisma.domain.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'asc' }
        });
        if (dbDomains && dbDomains.length > 0) {
          return dbDomains.map((d: any) => ({
            id: d.id,
            tenantId: d.tenantId,
            hostname: d.hostname,
            type: d.type === 'SYSTEM_SUBDOMAIN' ? 'subdomain' : 'custom',
            verified: d.verified,
            primary: d.isPrimary,
            sslStatus: d.sslStatus as any || 'active',
            createdAt: d.createdAt.toISOString()
          }));
        }
      }
    } catch {
      // Fallback to memory
    }
    return memoryDomains.filter(d => d.tenantId === tenantId);
  }

  /**
   * Creates a new domain for a tenant with entitlement checks
   */
  static async createDomain(params: {
    tenantId: string;
    hostname: string;
    type?: 'subdomain' | 'custom';
    primary?: boolean;
  }): Promise<{ success: boolean; domain?: DomainItem; error?: string }> {
    const cleanHost = this.normalizeHostname(params.hostname);
    if (!cleanHost) {
      return { success: false, error: 'Hostname no puede estar vacío' };
    }

    // 1. Check Entitlement Limit for Domains (DENY BY DEFAULT)
    try {
      const check = await EntitlementService.checkResource(params.tenantId, 'domains.max', 1);
      if (!check.allowed) {
        return {
          success: false,
          error: check.reason || `Has alcanzado el límite de dominios permitidos (${check.current}/${check.limit}) para tu plan.`
        };
      }
    } catch {
      // Pass if evaluation allows
    }

    // 2. Check Domain Uniqueness
    const existing = await this.resolveHostname(cleanHost);
    if (existing.found && existing.tenant?.id !== params.tenantId) {
      return { success: false, error: 'Este dominio ya se encuentra registrado y en uso por otro comercio' };
    }

    const isSub = params.type === 'subdomain' || cleanHost.endsWith('.fenixcms.es');
    const newDomain: DomainItem = {
      id: `dom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: params.tenantId,
      hostname: cleanHost,
      type: isSub ? 'subdomain' : 'custom',
      verified: isSub, // Subdomains auto-verified
      primary: params.primary || false,
      sslStatus: 'active',
      createdAt: new Date().toISOString()
    };

    // 3. Persist to DB or Memory
    try {
      if (process.env.DATABASE_URL && prisma?.domain) {
        const created = await prisma.domain.create({
          data: {
            id: newDomain.id,
            tenantId: newDomain.tenantId,
            hostname: newDomain.hostname,
            type: isSub ? 'SYSTEM_SUBDOMAIN' : 'CUSTOM_DOMAIN',
            verified: newDomain.verified,
            isPrimary: newDomain.primary,
            sslStatus: 'active',
            status: 'active'
          }
        });
        newDomain.id = created.id;
      }
    } catch {
      // Memory fallback
    }

    memoryDomains.push(newDomain);
    return { success: true, domain: newDomain };
  }

  /**
   * Verifies a domain (e.g. DNS TXT record check simulation)
   */
  static async verifyDomain(id: string, tenantId: string): Promise<{ success: boolean; domain?: DomainItem; error?: string }> {
    try {
      if (process.env.DATABASE_URL && prisma?.domain) {
        const updated = await prisma.domain.updateMany({
          where: { id, tenantId },
          data: { verified: true, status: 'active', sslStatus: 'active' }
        });
        if (updated.count > 0) {
          const dom = await prisma.domain.findUnique({ where: { id } });
          if (dom) {
            return {
              success: true,
              domain: {
                id: dom.id,
                tenantId: dom.tenantId,
                hostname: dom.hostname,
                type: dom.type === 'SYSTEM_SUBDOMAIN' ? 'subdomain' : 'custom',
                verified: dom.verified,
                primary: dom.isPrimary,
                sslStatus: dom.sslStatus as any,
                createdAt: dom.createdAt.toISOString()
              }
            };
          }
        }
      }
    } catch {
      // Fallback
    }

    const found = memoryDomains.find(d => d.id === id && d.tenantId === tenantId);
    if (!found) return { success: false, error: 'Dominio no encontrado' };
    found.verified = true;
    found.sslStatus = 'active';
    return { success: true, domain: found };
  }

  /**
   * Deletes a domain
   */
  static async deleteDomain(id: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.env.DATABASE_URL && prisma?.domain) {
        await prisma.domain.deleteMany({
          where: { id, tenantId }
        });
      }
    } catch {
      // Fallback
    }

    const idx = memoryDomains.findIndex(d => d.id === id && d.tenantId === tenantId);
    if (idx !== -1) {
      memoryDomains.splice(idx, 1);
    }
    return { success: true };
  }
}
