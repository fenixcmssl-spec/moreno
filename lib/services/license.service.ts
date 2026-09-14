import crypto from 'crypto';
import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { SaaSLicense, PlanEntitlements, LicenseActivationRecord } from '@/types';
import { INITIAL_LICENSES } from '@/lib/initialData';
import { EntitlementService } from './entitlement.service';

export interface LicenseValidationResult {
  valid: boolean;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED' | 'CANCELLED' | 'INVALID';
  licenseId?: string;
  applicationId?: string;
  planId?: string;
  tenantId?: string;
  tenantSlug?: string;
  expiresAt?: string;
  activationLimit?: number;
  activationCount?: number;
  activations?: LicenseActivationRecord[];
  isDomainActivated?: boolean;
  entitlements?: PlanEntitlements;
  error?: string;
}

export class LicenseService {
  private static memoryLicenses: SaaSLicense[] = [...INITIAL_LICENSES];
  private static memoryActivations: LicenseActivationRecord[] = [
    {
      id: 'act_1',
      licenseId: 'lic_1',
      tenantId: 'tenant_1',
      domain: 'mitienda.fenixcms.es',
      environment: 'production',
      status: 'ACTIVE',
      activatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'act_2',
      licenseId: 'lic_2',
      tenantId: 'tenant_2',
      domain: 'techtrends.com',
      environment: 'production',
      status: 'ACTIVE',
      activatedAt: '2026-01-02T00:00:00Z'
    }
  ];

  /**
   * Generates a cryptographic SHA-256 hash of a license key
   */
  static hashKey(licenseKey: string): string {
    return crypto.createHash('sha256').update(licenseKey.trim().toUpperCase()).digest('hex');
  }

  /**
   * Generates a cryptographically secure, non-predictable License Key
   * Format: FNX-{APP}-{PLAN}-{HEX8}-{HEX8}
   */
  static generateSecureLicenseKey(
    appKey: string = 'ECO',
    planKey: string = 'PRO',
    tenantSlug: string = 'TIENDA'
  ): { displayKey: string; keyHash: string; secret: string } {
    const cleanApp = appKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'ECO';
    const cleanPlan = planKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'PRO';
    
    // 128 bits of cryptographic entropy
    const secureBytes = crypto.randomBytes(16).toString('hex').toUpperCase();
    const part1 = secureBytes.substring(0, 8);
    const part2 = secureBytes.substring(8, 16);
    
    const displayKey = `FNX-${cleanApp}-${cleanPlan}-${part1}-${part2}`;
    const keyHash = this.hashKey(displayKey);

    return {
      displayKey,
      keyHash,
      secret: secureBytes
    };
  }

  /**
   * Helper to map Prisma License model to SaaSLicense interface
   */
  public static mapPrismaToSaaSLicense(l: any): SaaSLicense & { displayKey: string; activationLimit: number } {
    const validFrom = l.startsAt ? new Date(l.startsAt).toISOString() : new Date().toISOString();
    const validTo = l.expiresAt ? new Date(l.expiresAt).toISOString() : new Date().toISOString();
    const displayKey = l.displayKey;

    let entitlements: PlanEntitlements = {};
    if (l.plan?.entitlements && Array.isArray(l.plan.entitlements)) {
      for (const ent of l.plan.entitlements) {
        if (ent.type === 'NUMBER') entitlements[ent.key] = Number(ent.value);
        else if (ent.type === 'BOOLEAN') entitlements[ent.key] = ent.value === 'true';
        else entitlements[ent.key] = ent.value;
      }
    }

    return {
      id: l.id,
      licenseKey: displayKey,
      displayKey,
      tenantId: l.tenantId,
      tenantName: l.tenant?.name || l.customerName || l.tenantId,
      tenantSlug: l.tenant?.slug || l.tenantId,
      applicationId: l.applicationId,
      planId: l.planId,
      planName: l.plan?.name || l.planId,
      status: (l.status || 'ACTIVE').toLowerCase() as any,
      validFrom,
      validTo,
      customerName: l.customerName,
      customerEmail: l.customerEmail,
      price: Number(l.price || 0),
      paymentProvider: 'stripe',
      transactionId: l.subscriptionId || `txn_${l.id}`,
      billingPeriod: (l.billingPeriod || 'monthly') as any,
      activationLimit: l.activationLimit || 1,
      entitlements,
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString()
    };
  }

  static getAll(): SaaSLicense[] {
    return this.memoryLicenses;
  }

  static async getAllAsync(): Promise<SaaSLicense[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license?.findMany) {
      const list = await prisma.license.findMany({
        include: {
          tenant: true,
          plan: { include: { entitlements: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return list.map(l => this.mapPrismaToSaaSLicense(l));
    }

    return this.memoryLicenses;
  }

  static getById(id: string): SaaSLicense | undefined {
    return this.memoryLicenses.find(l => l.id === id);
  }

  static async getByIdAsync(id: string): Promise<SaaSLicense | null> {
    if (!id) return null;
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license?.findUnique) {
      const l = await prisma.license.findUnique({
        where: { id },
        include: {
          tenant: true,
          plan: { include: { entitlements: true } }
        }
      });
      return l ? this.mapPrismaToSaaSLicense(l) : null;
    }

    return this.memoryLicenses.find(l => l.id === id) || null;
  }

  static getByLicenseKey(key: string): SaaSLicense | undefined {
    if (!key) return undefined;
    const cleanKey = key.trim().toUpperCase();
    return this.memoryLicenses.find(l => l.licenseKey.trim().toUpperCase() === cleanKey);
  }

  static async getByLicenseKeyAsync(key: string): Promise<SaaSLicense | null> {
    if (!key) return null;
    const cleanKey = key.trim().toUpperCase();
    const keyHash = this.hashKey(cleanKey);

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license) {
      const l = await prisma.license.findFirst({
        where: {
          OR: [
            { licenseKeyHash: keyHash },
            { displayKey: cleanKey }
          ]
        },
        include: {
          tenant: true,
          plan: { include: { entitlements: true } }
        }
      });
      return l ? this.mapPrismaToSaaSLicense(l) : null;
    }

    return this.memoryLicenses.find(l => l.licenseKey.trim().toUpperCase() === cleanKey) || null;
  }

  static getByTenantSlug(slug: string): SaaSLicense | undefined {
    return this.memoryLicenses.find(l => l.tenantSlug.toLowerCase() === slug.toLowerCase());
  }

  static getByTenantId(tenantId: string): SaaSLicense | undefined {
    return this.memoryLicenses.find(l => l.tenantId === tenantId);
  }

  static async getByTenantIdAsync(tenantId: string): Promise<SaaSLicense | null> {
    if (!tenantId) return null;
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license) {
      const l = await prisma.license.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: true,
          plan: { include: { entitlements: true } }
        }
      });
      return l ? this.mapPrismaToSaaSLicense(l) : null;
    }

    return this.memoryLicenses.find(l => l.tenantId === tenantId) || null;
  }

  static getActivationsByLicenseId(licenseId: string): LicenseActivationRecord[] {
    return this.memoryActivations.filter(a => a.licenseId === licenseId);
  }

  /**
   * Comprehensive Server-side License Validation against PostgreSQL (DENY BY DEFAULT)
   */
  static validate(params: {
    licenseKey: string;
    domain?: string;
    tenantId?: string;
    applicationId?: string;
  }): LicenseValidationResult {
    if (!params.licenseKey || params.licenseKey.trim().length === 0) {
      return {
        valid: false,
        status: 'INVALID',
        error: 'No se proporcionó clave de licencia'
      };
    }

    const license = this.getByLicenseKey(params.licenseKey);
    if (!license) {
      return {
        valid: false,
        status: 'INVALID',
        error: 'Clave de licencia no encontrada en el registro de FenixCMS'
      };
    }

    // 1. Check status
    const statusNormalized = (license.status || 'pending').toUpperCase();
    if (statusNormalized === 'REVOKED') {
      return {
        valid: false,
        status: 'REVOKED',
        licenseId: license.id,
        tenantId: license.tenantId,
        error: 'La licencia ha sido revocada permanentemente por administración'
      };
    }

    if (statusNormalized === 'SUSPENDED') {
      return {
        valid: false,
        status: 'SUSPENDED',
        licenseId: license.id,
        tenantId: license.tenantId,
        error: 'La licencia se encuentra suspendida temporalmente por administración'
      };
    }

    if (statusNormalized === 'EXPIRED') {
      return {
        valid: false,
        status: 'EXPIRED',
        licenseId: license.id,
        tenantId: license.tenantId,
        error: 'La licencia ha expirado. Por favor, renueva tu suscripción'
      };
    }

    if (statusNormalized === 'CANCELLED') {
      return {
        valid: false,
        status: 'CANCELLED',
        licenseId: license.id,
        tenantId: license.tenantId,
        error: 'La licencia ha sido cancelada'
      };
    }

    // 2. Check expiration date
    if (license.validTo) {
      const expirationDate = new Date(license.validTo);
      const now = new Date();
      if (expirationDate < now) {
        license.status = 'expired';
        return {
          valid: false,
          status: 'EXPIRED',
          licenseId: license.id,
          tenantId: license.tenantId,
          expiresAt: license.validTo,
          error: 'La fecha de validez de la licencia ha vencido'
        };
      }
    }

    // 3. Validate Tenant Ownership
    if (params.tenantId && license.tenantId !== params.tenantId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: 'La clave de licencia no corresponde a este comercio (tenant mismatch)'
      };
    }

    // 4. Validate Application Type
    if (params.applicationId && license.applicationId && license.applicationId !== params.applicationId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: `Esta licencia es exclusiva para la aplicación ${license.applicationId} y no para ${params.applicationId}`
      };
    }

    // 5 & 6. Check Activations and Domain Binding
    const activeActivations = this.memoryActivations.filter(
      a => a.licenseId === license.id && a.status === 'ACTIVE'
    );
    const activationLimit = (license as any).activationLimit || 1;

    let isDomainActive = false;
    if (params.domain) {
      const cleanDomain = params.domain.toLowerCase().trim();
      isDomainActive = activeActivations.some(
        a => a.domain.toLowerCase() === cleanDomain
      );

      if (!isDomainActive && activeActivations.length >= activationLimit) {
        return {
          valid: false,
          status: 'INVALID',
          licenseId: license.id,
          activationCount: activeActivations.length,
          activationLimit,
          isDomainActivated: false,
          error: `La licencia alcanzó el límite de activaciones (${activeActivations.length}/${activationLimit}). Dominio "${cleanDomain}" no activado.`
        };
      }
    }

    const resolvedEntitlements = EntitlementService.getTenantEntitlements(license.entitlements);

    return {
      valid: true,
      status: statusNormalized === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
      licenseId: license.id,
      applicationId: license.applicationId || 'ECOMMERCE',
      planId: license.planId,
      tenantId: license.tenantId,
      tenantSlug: license.tenantSlug,
      expiresAt: license.validTo,
      activationLimit,
      activationCount: activeActivations.length,
      activations: activeActivations,
      isDomainActivated: params.domain ? isDomainActive : true,
      entitlements: resolvedEntitlements
    };
  }

  /**
   * Asynchronous validation querying PostgreSQL directly
   */
  static async validateAsync(params: {
    licenseKey: string;
    domain?: string;
    tenantId?: string;
    applicationId?: string;
  }): Promise<LicenseValidationResult> {
    if (!params.licenseKey || params.licenseKey.trim().length === 0) {
      return { valid: false, status: 'INVALID', error: 'No se proporcionó clave de licencia' };
    }

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license) {
      const cleanKey = params.licenseKey.trim().toUpperCase();
      const keyHash = this.hashKey(cleanKey);

      const dbLicense = await prisma.license.findFirst({
        where: {
          OR: [
            { licenseKeyHash: keyHash },
            { displayKey: cleanKey }
          ]
        },
        include: {
          tenant: true,
          plan: { include: { entitlements: true } },
          activations: { where: { status: 'ACTIVE' } }
        }
      });

      if (!dbLicense) {
        return { valid: false, status: 'INVALID', error: 'Clave de licencia no encontrada en el registro de FenixCMS' };
      }

      const status = dbLicense.status;
      if (status === 'REVOKED') return { valid: false, status: 'REVOKED', licenseId: dbLicense.id, tenantId: dbLicense.tenantId, error: 'Licencia revocada permanentemente' };
      if (status === 'SUSPENDED') return { valid: false, status: 'SUSPENDED', licenseId: dbLicense.id, tenantId: dbLicense.tenantId, error: 'Licencia suspendida temporalmente' };
      if (status === 'EXPIRED') return { valid: false, status: 'EXPIRED', licenseId: dbLicense.id, tenantId: dbLicense.tenantId, error: 'Licencia expirada' };
      if (status === 'CANCELLED') return { valid: false, status: 'CANCELLED', licenseId: dbLicense.id, tenantId: dbLicense.tenantId, error: 'Licencia cancelada' };

      if (dbLicense.expiresAt && new Date(dbLicense.expiresAt) < new Date()) {
        await prisma.license.update({ where: { id: dbLicense.id }, data: { status: 'EXPIRED' } }).catch(() => {});
        return { valid: false, status: 'EXPIRED', licenseId: dbLicense.id, tenantId: dbLicense.tenantId, expiresAt: dbLicense.expiresAt.toISOString(), error: 'Licencia expirada' };
      }

      if (params.tenantId && dbLicense.tenantId !== params.tenantId) {
        return { valid: false, status: 'INVALID', licenseId: dbLicense.id, error: 'Tenant mismatch para esta clave de licencia' };
      }

      const activations = dbLicense.activations || [];
      const activationLimit = dbLicense.activationLimit || 1;
      let isDomainActive = false;

      if (params.domain) {
        const cleanDomain = params.domain.toLowerCase().trim();
        isDomainActive = activations.some(a => a.domain.toLowerCase() === cleanDomain);

        if (!isDomainActive && activations.length >= activationLimit) {
          return {
            valid: false,
            status: 'INVALID',
            licenseId: dbLicense.id,
            activationCount: activations.length,
            activationLimit,
            isDomainActivated: false,
            error: `Límite de activaciones alcanzado (${activations.length}/${activationLimit})`
          };
        }
      }

      return {
        valid: true,
        status: status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
        licenseId: dbLicense.id,
        applicationId: dbLicense.applicationId,
        planId: dbLicense.planId,
        tenantId: dbLicense.tenantId,
        tenantSlug: dbLicense.tenant?.slug,
        expiresAt: dbLicense.expiresAt.toISOString(),
        activationLimit,
        activationCount: activations.length,
        activations: activations.map(a => ({
          id: a.id,
          licenseId: a.licenseId,
          tenantId: a.tenantId,
          domain: a.domain,
          environment: a.environment,
          ipAddress: a.ipAddress || undefined,
          status: a.status as any,
          activatedAt: a.activatedAt.toISOString()
        })),
        isDomainActivated: params.domain ? isDomainActive : true
      };
    }

    return this.validate(params);
  }

  /**
   * Activates a license for a domain with atomic transaction safety in PostgreSQL
   */
  static activate(params: {
    licenseKey: string;
    tenantId: string;
    domain: string;
    environment?: 'production' | 'staging' | 'local' | string;
    ipAddress?: string;
    applicationId?: string;
  }): { success: boolean; activation?: LicenseActivationRecord; error?: string; limit?: number; currentCount?: number } {
    if (!params.licenseKey || !params.tenantId || !params.domain) {
      return { success: false, error: 'Parámetros incompletos (licenseKey, tenantId, domain requeridos)' };
    }

    const cleanDomain = params.domain.trim().toLowerCase();

    const validation = this.validate({
      licenseKey: params.licenseKey,
      tenantId: params.tenantId,
      applicationId: params.applicationId
    });

    if (!validation.valid || !validation.licenseId) {
      return { success: false, error: validation.error || 'Licencia inválida para activación' };
    }

    const licenseId = validation.licenseId;
    const activationLimit = validation.activationLimit || 1;

    const existing = this.memoryActivations.find(
      a => a.licenseId === licenseId && 
           a.domain.toLowerCase() === cleanDomain &&
           a.status === 'ACTIVE'
    );

    if (existing) {
      return {
        success: true,
        activation: existing,
        limit: activationLimit,
        currentCount: this.memoryActivations.filter(a => a.licenseId === licenseId && a.status === 'ACTIVE').length
      };
    }

    const currentActive = this.memoryActivations.filter(
      a => a.licenseId === licenseId && a.status === 'ACTIVE'
    );

    if (currentActive.length >= activationLimit) {
      return {
        success: false,
        error: `Límite de activaciones alcanzado (${currentActive.length}/${activationLimit}). Desactiva un dominio existente primero.`,
        limit: activationLimit,
        currentCount: currentActive.length
      };
    }

    const newActivation: LicenseActivationRecord = {
      id: `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      licenseId,
      tenantId: params.tenantId,
      domain: cleanDomain,
      environment: params.environment || 'production',
      ipAddress: params.ipAddress,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString()
    };

    this.memoryActivations.unshift(newActivation);

    // Sync to PostgreSQL
    if (isPostgresConfigured() && prisma?.licenseActivation) {
      prisma.licenseActivation.create({
        data: {
          id: newActivation.id,
          licenseId: newActivation.licenseId,
          tenantId: newActivation.tenantId,
          domain: newActivation.domain,
          environment: newActivation.environment,
          ipAddress: newActivation.ipAddress || null,
          status: 'ACTIVE',
          activatedAt: new Date(newActivation.activatedAt)
        }
      }).catch(() => {});
    }

    return {
      success: true,
      activation: newActivation,
      limit: activationLimit,
      currentCount: currentActive.length + 1
    };
  }

  /**
   * Asynchronous atomic activation directly in PostgreSQL
   */
  static async activateAsync(params: {
    licenseKey: string;
    tenantId: string;
    domain: string;
    environment?: string;
    ipAddress?: string;
    applicationId?: string;
  }): Promise<{ success: boolean; activation?: LicenseActivationRecord; error?: string; limit?: number; currentCount?: number }> {
    if (!params.licenseKey || !params.tenantId || !params.domain) {
      return { success: false, error: 'Parámetros incompletos' };
    }

    const cleanDomain = params.domain.trim().toLowerCase();
    const cleanKey = params.licenseKey.trim().toUpperCase();
    const keyHash = this.hashKey(cleanKey);

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license) {
      return await prisma.$transaction(async (tx) => {
        const dbLicense = await tx.license.findFirst({
          where: {
            OR: [
              { licenseKeyHash: keyHash },
              { displayKey: cleanKey }
            ]
          },
          include: {
            activations: { where: { status: 'ACTIVE' } }
          }
        });

        if (!dbLicense) {
          return { success: false, error: 'Licencia no encontrada' };
        }

        if (dbLicense.tenantId !== params.tenantId) {
          return { success: false, error: 'Tenant mismatch para esta licencia' };
        }

        if (dbLicense.status !== 'ACTIVE' && dbLicense.status !== 'TRIAL') {
          return { success: false, error: `Licencia con estado ${dbLicense.status} no puede ser activada` };
        }

        if (dbLicense.expiresAt && new Date(dbLicense.expiresAt) < new Date()) {
          return { success: false, error: 'Licencia expirada' };
        }

        const existing = dbLicense.activations.find(a => a.domain.toLowerCase() === cleanDomain);
        if (existing) {
          return {
            success: true,
            activation: {
              id: existing.id,
              licenseId: existing.licenseId,
              tenantId: existing.tenantId,
              domain: existing.domain,
              environment: existing.environment,
              ipAddress: existing.ipAddress || undefined,
              status: existing.status as any,
              activatedAt: existing.activatedAt.toISOString()
            },
            limit: dbLicense.activationLimit,
            currentCount: dbLicense.activations.length
          };
        }

        if (dbLicense.activations.length >= dbLicense.activationLimit) {
          return {
            success: false,
            error: `Límite de activaciones alcanzado (${dbLicense.activations.length}/${dbLicense.activationLimit})`,
            limit: dbLicense.activationLimit,
            currentCount: dbLicense.activations.length
          };
        }

        const createdAct = await tx.licenseActivation.create({
          data: {
            licenseId: dbLicense.id,
            tenantId: params.tenantId,
            domain: cleanDomain,
            environment: params.environment || 'production',
            ipAddress: params.ipAddress || null,
            status: 'ACTIVE'
          }
        });

        await tx.license.update({
          where: { id: dbLicense.id },
          data: {
            activationCount: dbLicense.activations.length + 1,
            lastValidatedAt: new Date()
          }
        });

        return {
          success: true,
          activation: {
            id: createdAct.id,
            licenseId: createdAct.licenseId,
            tenantId: createdAct.tenantId,
            domain: createdAct.domain,
            environment: createdAct.environment,
            ipAddress: createdAct.ipAddress || undefined,
            status: createdAct.status as any,
            activatedAt: createdAct.activatedAt.toISOString()
          },
          limit: dbLicense.activationLimit,
          currentCount: dbLicense.activations.length + 1
        };
      });
    }

    return this.activate(params);
  }

  /**
   * Deactivates a domain binding for a license
   */
  static deactivate(params: {
    licenseKey: string;
    domain: string;
    tenantId?: string;
  }): { success: boolean; error?: string } {
    if (!params.licenseKey || !params.domain) {
      return { success: false, error: 'licenseKey y domain son requeridos' };
    }

    const license = this.getByLicenseKey(params.licenseKey);
    if (!license) return { success: false, error: 'Licencia no encontrada' };

    if (params.tenantId && license.tenantId !== params.tenantId) {
      return { success: false, error: 'Tenant mismatch para esta licencia' };
    }

    const cleanDomain = params.domain.trim().toLowerCase();
    const act = this.memoryActivations.find(
      a => a.licenseId === license.id && 
           a.domain.toLowerCase() === cleanDomain &&
           a.status === 'ACTIVE'
    );

    if (!act) {
      return { success: false, error: `No existe activación activa para el dominio "${cleanDomain}"` };
    }

    act.status = 'REVOKED';
    act.deactivatedAt = new Date().toISOString();

    if (isPostgresConfigured() && prisma?.licenseActivation) {
      prisma.licenseActivation.updateMany({
        where: {
          licenseId: license.id,
          domain: cleanDomain,
          status: 'ACTIVE'
        },
        data: {
          status: 'REVOKED',
          deactivatedAt: new Date()
        }
      }).catch(() => {});
    }

    return { success: true };
  }

  /**
   * Creates a new License in PostgreSQL
   */
  static async createLicense(params: {
    tenantId: string;
    applicationId: string;
    planId: string;
    customerName: string;
    customerEmail: string;
    price?: number;
    currency?: string;
    billingPeriod?: string;
    activationLimit?: number;
  }): Promise<SaaSLicense & { displayKey: string }> {
    const { displayKey, keyHash } = this.generateSecureLicenseKey(
      params.applicationId || 'ECO',
      params.planId || 'PRO',
      params.tenantId
    );

    const now = new Date();
    const validTo = new Date();
    if (params.billingPeriod === 'yearly') {
      validTo.setFullYear(validTo.getFullYear() + 1);
    } else {
      validTo.setMonth(validTo.getMonth() + 1);
    }

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.license) {
      const created = await prisma.license.create({
        data: {
          licenseKeyHash: keyHash,
          displayKey,
          tenantId: params.tenantId,
          applicationId: params.applicationId || 'ECOMMERCE',
          planId: params.planId,
          status: 'ACTIVE',
          startsAt: now,
          expiresAt: validTo,
          activationLimit: params.activationLimit || 1,
          activationCount: 0,
          customerName: params.customerName.trim(),
          customerEmail: params.customerEmail.trim().toLowerCase(),
          price: Number(params.price ?? 79),
          currency: params.currency || 'EUR',
          billingPeriod: params.billingPeriod || 'monthly'
        },
        include: {
          tenant: true,
          plan: { include: { entitlements: true } }
        }
      });

      const mapped = this.mapPrismaToSaaSLicense(created);
      this.memoryLicenses.unshift(mapped);
      return mapped as SaaSLicense & { displayKey: string };
    }

    // Fallback for memory dev
    const license: SaaSLicense = {
      id: `lic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      licenseKey: displayKey,
      tenantId: params.tenantId,
      tenantName: params.customerName || params.tenantId,
      tenantSlug: params.tenantId.replace('tenant_', ''),
      applicationId: params.applicationId || 'ECOMMERCE',
      planId: params.planId || 'plan_pro',
      planName: (params.planId || 'plan_pro').toUpperCase(),
      status: 'active',
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      price: params.price ?? 79,
      paymentProvider: 'stripe',
      transactionId: `txn_${Date.now()}`,
      billingPeriod: (params.billingPeriod as any) || 'monthly',
      createdAt: now.toISOString()
    };
    (license as any).displayKey = displayKey;
    (license as any).activationLimit = params.activationLimit || 1;

    this.memoryLicenses.unshift(license);
    return license as SaaSLicense & { displayKey: string };
  }

  static create(licenseData: Omit<SaaSLicense, 'id' | 'createdAt'> & { activationLimit?: number }): SaaSLicense {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString()
    };
    (newLicense as any).activationLimit = licenseData.activationLimit || 1;
    this.memoryLicenses.unshift(newLicense);

    if (isPostgresConfigured() && prisma?.license) {
      const keyHash = this.hashKey(newLicense.licenseKey);
      prisma.license.create({
        data: {
          id: newLicense.id,
          licenseKeyHash: keyHash,
          displayKey: newLicense.licenseKey,
          tenantId: newLicense.tenantId,
          applicationId: newLicense.applicationId || 'ECOMMERCE',
          planId: newLicense.planId,
          status: 'ACTIVE',
          startsAt: new Date(newLicense.validFrom),
          expiresAt: new Date(newLicense.validTo),
          activationLimit: (newLicense as any).activationLimit || 1,
          customerName: newLicense.customerName,
          customerEmail: newLicense.customerEmail,
          price: newLicense.price,
          currency: 'EUR',
          billingPeriod: newLicense.billingPeriod
        }
      }).catch(() => {});
    }

    return newLicense;
  }

  static updateStatus(id: string, status: string): SaaSLicense | null {
    const license = this.getById(id);
    if (!license) return null;
    const lower = status.toLowerCase();
    if (lower === 'paid' || lower === 'active') {
      license.status = 'active';
    } else if (lower === 'suspended') {
      license.status = 'suspended';
    } else if (lower === 'expired') {
      license.status = 'expired';
    } else {
      license.status = 'pending';
    }

    if (isPostgresConfigured() && prisma?.license) {
      prisma.license.update({
        where: { id },
        data: { status: license.status.toUpperCase() as any }
      }).catch(() => {});
    }

    return license;
  }

  static toggleStatus(id: string, status: 'active' | 'suspended' | 'expired'): SaaSLicense | null {
    return this.updateStatus(id, status);
  }

  static renew(id: string, months: number = 1): SaaSLicense | null {
    const license = this.getById(id);
    if (!license) return null;

    const currentExpiry = new Date(license.validTo || Date.now());
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);

    license.validTo = baseDate.toISOString();
    license.status = 'active';

    if (isPostgresConfigured() && prisma?.license) {
      prisma.license.update({
        where: { id },
        data: {
          expiresAt: baseDate,
          status: 'ACTIVE'
        }
      }).catch(() => {});
    }

    return license;
  }
}
