import crypto from 'crypto';
import { SaaSLicense, PlanEntitlements } from '@/types';
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
  entitlements?: PlanEntitlements;
  error?: string;
}

export interface LicenseActivationRecord {
  id: string;
  licenseId: string;
  tenantId: string;
  domain: string;
  environment: 'production' | 'staging' | 'local';
  ipAddress?: string;
  status: 'ACTIVE' | 'REVOKED';
  activatedAt: string;
  deactivatedAt?: string;
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
    const cleanKey = key.trim().toUpperCase();
    return this.licenses.find(l => l.licenseKey.trim().toUpperCase() === cleanKey);
  }

  static getByTenantSlug(slug: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.tenantSlug.toLowerCase() === slug.toLowerCase());
  }

  static getByTenantId(tenantId: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.tenantId === tenantId);
  }

  /**
   * Comprehensive Server-side License Validation (DENY BY DEFAULT)
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

    // Check status
    const statusNormalized = (license.status || 'pending').toUpperCase();
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

    // Check expiration date
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

    // Validate Tenant Ownership if specified
    if (params.tenantId && license.tenantId !== params.tenantId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: 'La clave de licencia no corresponde a este comercio (tenant mismatch)'
      };
    }

    // Validate Application Type if specified
    if (params.applicationId && license.applicationId && license.applicationId !== params.applicationId) {
      return {
        valid: false,
        status: 'INVALID',
        licenseId: license.id,
        error: `Esta licencia es exclusiva para la aplicación ${license.applicationId} y no para ${params.applicationId}`
      };
    }

    // Check Domain Activation if specified
    const activeActivations = this.activations.filter(
      a => a.licenseId === license.id && a.status === 'ACTIVE'
    );

    if (params.domain) {
      const isDomainActive = activeActivations.some(
        a => a.domain.toLowerCase() === params.domain?.toLowerCase()
      );
      if (!isDomainActive && activeActivations.length >= 1) {
        // Not activated for this domain yet
        return {
          valid: false,
          status: 'INVALID',
          licenseId: license.id,
          activationCount: activeActivations.length,
          activationLimit: 1,
          error: `La licencia está asignada a otro dominio (${activeActivations[0].domain}). Se requiere activación previa.`
        };
      }
    }

    // Get Resolved Entitlements
    const resolvedEntitlements = EntitlementService.getTenantEntitlements(license.entitlements);

    return {
      valid: true,
      status: 'ACTIVE',
      licenseId: license.id,
      applicationId: license.applicationId || 'ECOMMERCE',
      planId: license.planId,
      tenantId: license.tenantId,
      tenantSlug: license.tenantSlug,
      expiresAt: license.validTo,
      activationLimit: 1,
      activationCount: activeActivations.length,
      entitlements: resolvedEntitlements
    };
  }

  /**
   * Activates a license for a specific domain & tenant
   */
  static activate(params: {
    licenseKey: string;
    tenantId: string;
    domain: string;
    environment?: 'production' | 'staging' | 'local';
    ipAddress?: string;
  }): { success: boolean; activation?: LicenseActivationRecord; error?: string } {
    const validation = this.validate({
      licenseKey: params.licenseKey,
      tenantId: params.tenantId
    });

    if (!validation.valid || !validation.licenseId) {
      return { success: false, error: validation.error || 'Licencia inválida para activación' };
    }

    // Check existing activations
    const existing = this.activations.find(
      a => a.licenseId === validation.licenseId && 
           a.domain.toLowerCase() === params.domain.toLowerCase() &&
           a.status === 'ACTIVE'
    );

    if (existing) {
      return { success: true, activation: existing };
    }

    const currentCount = this.activations.filter(
      a => a.licenseId === validation.licenseId && a.status === 'ACTIVE'
    ).length;

    const limit = validation.activationLimit || 1;
    if (currentCount >= limit) {
      return {
        success: false,
        error: `Límite de activaciones alcanzado (${currentCount}/${limit}). Desactiva el dominio anterior primero.`
      };
    }

    const newActivation: LicenseActivationRecord = {
      id: `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      licenseId: validation.licenseId,
      tenantId: params.tenantId,
      domain: params.domain.toLowerCase(),
      environment: params.environment || 'production',
      ipAddress: params.ipAddress,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString()
    };

    this.activations.unshift(newActivation);
    return { success: true, activation: newActivation };
  }

  /**
   * Deactivates a domain binding
   */
  static deactivate(params: {
    licenseKey: string;
    domain: string;
  }): { success: boolean; error?: string } {
    const license = this.getByLicenseKey(params.licenseKey);
    if (!license) return { success: false, error: 'Licencia no encontrada' };

    const act = this.activations.find(
      a => a.licenseId === license.id && 
           a.domain.toLowerCase() === params.domain.toLowerCase() &&
           a.status === 'ACTIVE'
    );

    if (!act) {
      return { success: false, error: 'No existe activación activa para este dominio' };
    }

    act.status = 'REVOKED';
    act.deactivatedAt = new Date().toISOString();
    return { success: true };
  }

  static create(licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>): SaaSLicense {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString()
    };
    this.licenses.unshift(newLicense);
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

