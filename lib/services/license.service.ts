import { SaaSLicense } from '@/types';
import { INITIAL_LICENSES } from '@/lib/initialData';

export class LicenseService {
  private static licenses: SaaSLicense[] = [...INITIAL_LICENSES];

  static getAll(): SaaSLicense[] {
    return this.licenses;
  }

  static getById(id: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.id === id);
  }

  static getByLicenseKey(key: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.licenseKey.trim().toUpperCase() === key.trim().toUpperCase());
  }

  static getByTenantSlug(slug: string): SaaSLicense | undefined {
    return this.licenses.find(l => l.tenantSlug.toLowerCase() === slug.toLowerCase());
  }

  static generateSecureLicenseKey(appKey: string = 'ECO', planKey: string = 'PRO', tenantSlug: string = 'TIENDA'): string {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const cleanApp = appKey.substring(0, 3).toUpperCase();
    const cleanPlan = planKey.substring(0, 3).toUpperCase();
    const cleanTenant = tenantSlug.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    return `FNX-${cleanApp}-${cleanPlan}-${randomDigits}-${randomHex}-${cleanTenant}`;
  }

  static create(licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>): SaaSLicense {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}`,
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
}
