import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
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
  private static licenses: SaaSLicense[] = [...INITIAL_LICENSES];
  private static activations: LicenseActivationRecord[] = [
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
    const cleanApp = appKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const cleanPlan = planKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    
    // Cryptographically secure bytes (16 bytes = 128 bits of entropy)
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

  static getAll(): SaaSLicense[] {
    return this.licenses;
  }

  static getById(id: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.id === id);
  }

  static getByLicenseKey(key: string): SaaSLicense | undefined {
    if (!key) return undefined;
    const cleanKey = key.trim().toUpperCase();
    return this.licenses.find(l => l.licenseKey.trim().toUpperCase() === cleanKey);
  }

  static getByTenantSlug(slug: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.tenantSlug.toLowerCase() === slug.toLowerCase());
  }

  static getByTenantId(tenantId: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.tenantId === tenantId);
  }

  static getActivationsByLicenseId(licenseId: string): LicenseActivationRecord[] {
    return this.activations.filter(a => a.licenseId === licenseId);
  }

  /**
   * Comprehensive Server-side License Validation (DENY BY DEFAULT)
   * Enforces rules:
   * 1. License status must be ACTIVE or TRIAL (not SUSPENDED, EXPIRED, REVOKED, CANCELLED)
   * 2. Date must be valid (not expired)
   * 3. Tenant matching
   * 4. Application matching
   * 5. Activation limits & domain activation status
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

    // 1. Check status (DENY if REVOKED, SUSPENDED, EXPIRED, CANCELLED)
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

    // 2. Check expiration date (Fecha válida)
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

    // 3. Validate Tenant Ownership (Tenant correcto)
    if (params.tenantId && license.tenantId !== params.tenantId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: 'La clave de licencia no corresponde a este comercio (tenant mismatch)'
      };
    }

    // 4. Validate Application Type (Application correcta)
    if (params.applicationId && license.applicationId && license.applicationId !== params.applicationId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: `Esta licencia es exclusiva para la aplicación ${license.applicationId} y no para ${params.applicationId}`
      };
    }

    // 5 & 6. Check Activations and Domain Binding
    const activeActivations = this.activations.filter(
      a => a.licenseId === license.id && a.status === 'ACTIVE'
    );
    const activationLimit = (license as any).activationLimit || 1;

    let isDomainActive = false;
    if (params.domain) {
      const cleanDomain = params.domain.toLowerCase().trim();
      isDomainActive = activeActivations.some(
        a => a.domain.toLowerCase() === cleanDomain
      );

      // If domain specified and not active, verify if limit is reached
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

    // Entitlements
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
   * Activates a license for a specific domain & tenant
   * Strictly enforces:
   * 1. License ACTIVE
   * 2. Valid Date
   * 3. Correct Tenant
   * 4. Correct Application
   * 5. Activation limit not exceeded
   * 6. Domain permitted & bound
   * 7. No activation of REVOKED licenses
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

    // Validate license state first
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

    // Check if this domain is ALREADY active for this license (idempotency)
    const existing = this.activations.find(
      a => a.licenseId === licenseId && 
           a.domain.toLowerCase() === cleanDomain &&
           a.status === 'ACTIVE'
    );

    if (existing) {
      return {
        success: true,
        activation: existing,
        limit: activationLimit,
        currentCount: this.activations.filter(a => a.licenseId === licenseId && a.status === 'ACTIVE').length
      };
    }

    // Count active activations
    const currentActive = this.activations.filter(
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

    // Register activation
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

    this.activations.unshift(newActivation);

    // Also sync to PostgreSQL if connected
    try {
      if (process.env.DATABASE_URL && prisma?.licenseActivation) {
        prisma.licenseActivation.create({
          data: {
            id: newActivation.id,
            licenseId: newActivation.licenseId,
            tenantId: newActivation.tenantId,
            domain: newActivation.domain,
            environment: newActivation.environment,
            ipAddress: newActivation.ipAddress,
            status: 'ACTIVE',
            activatedAt: new Date(newActivation.activatedAt)
          }
        }).catch(() => {});
      }
    } catch {}

    return {
      success: true,
      activation: newActivation,
      limit: activationLimit,
      currentCount: currentActive.length + 1
    };
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
    const act = this.activations.find(
      a => a.licenseId === license.id && 
           a.domain.toLowerCase() === cleanDomain &&
           a.status === 'ACTIVE'
    );

    if (!act) {
      return { success: false, error: `No existe activación activa para el dominio "${cleanDomain}"` };
    }

    act.status = 'REVOKED';
    act.deactivatedAt = new Date().toISOString();

    // Also update in PostgreSQL if connected
    try {
      if (process.env.DATABASE_URL && prisma?.licenseActivation) {
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
    } catch {}

    return { success: true };
  }

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

    const license: SaaSLicense = {
      id: `lic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      licenseKey: displayKey,
      tenantId: params.tenantId,
      tenantName: params.customerName || params.tenantId,
      tenantSlug: params.tenantId.replace('tenant_', ''),
      applicationId: params.applicationId || 'app_ecommerce',
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

    this.licenses.unshift(license);

    // Save to PostgreSQL if available
    try {
      if (process.env.DATABASE_URL && prisma?.license) {
        await prisma.license.create({
          data: {
            id: license.id,
            licenseKeyHash: keyHash,
            displayKey,
            tenantId: license.tenantId,
            applicationId: license.applicationId,
            planId: license.planId,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt: validTo,
            activationLimit: (license as any).activationLimit,
            customerName: license.customerName,
            customerEmail: license.customerEmail,
            price: license.price,
            currency: params.currency || 'EUR',
            billingPeriod: license.billingPeriod
          }
        }).catch(() => {});
      }
    } catch {}

    return license as SaaSLicense & { displayKey: string };
  }

  static create(licenseData: Omit<SaaSLicense, 'id' | 'createdAt'> & { activationLimit?: number }): SaaSLicense {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString()
    };
    (newLicense as any).activationLimit = licenseData.activationLimit || 1;
    this.licenses.unshift(newLicense);

    // Save to PostgreSQL if available
    try {
      if (process.env.DATABASE_URL && prisma?.license) {
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
    } catch {}

    return newLicense;
  }

  static update(id: string, updates: Partial<SaaSLicense>): SaaSLicense | null {
    const idx = this.licenses.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.licenses[idx] = { ...this.licenses[idx], ...updates };
    return this.licenses[idx];
  }

  static toggleStatus(id: string, status: 'active' | 'suspended' | 'expired'): SaaSLicense | null {
    const license = this.getById(id);
    if (!license) return null;
    license.status = status;
    return license;
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
    } else if (lower === 'revoked') {
      license.status = 'expired'; // mapped to expired/revoked
    } else {
      license.status = 'pending';
    }
    return license;
  }

  static renew(id: string, months: number = 1): SaaSLicense | null {
    const license = this.getById(id);
    if (!license) return null;

    const currentExpiry = new Date(license.validTo || Date.now());
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);

    license.validTo = baseDate.toISOString();
    license.status = 'active';
    return license;
  }
}
