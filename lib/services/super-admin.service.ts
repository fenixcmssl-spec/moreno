import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '../prisma';
import { AuditService } from './audit.service';
import { PasswordService } from '../auth/password';
import { UserRole } from '../auth/rbac';
import { 
  INITIAL_APPLICATIONS, 
  INITIAL_PLANS, 
  INITIAL_LICENSES, 
  INITIAL_TENANTS, 
  INITIAL_THEMES, 
  INITIAL_PLUGINS 
} from '../initialData';

export interface DashboardMetrics {
  mrr: number;
  arr: number;
  tenants: number;
  activeLicenses: number;
  trialLicenses: number;
  expiredLicenses: number;
  cancelledSubscriptions: number;
  failedPayments: number;
  currency: string;
  totalUsers: number;
  activeSubscriptions: number;
  totalInvoices: number;
  revenueTotal: number;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultLocale: string;
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  bizumEnabled: boolean;
  maintenanceMode: boolean;
  autoProvisionSSL: boolean;
  allowRegistrations: boolean;
  trialDaysDefault: number;
  vatPercentage: number;
  updatedAt: string;
}

export class SuperAdminService {
  private static defaultSettings: PlatformSettings = {
    platformName: 'FenixCMS Cloud Engine',
    supportEmail: 'admin@fenixcms.io',
    defaultCurrency: 'EUR',
    defaultLocale: 'es',
    stripeEnabled: true,
    paypalEnabled: true,
    bizumEnabled: true,
    maintenanceMode: false,
    autoProvisionSSL: true,
    allowRegistrations: true,
    trialDaysDefault: 14,
    vatPercentage: 21,
    updatedAt: new Date().toISOString()
  };

  /**
   * 1. DASHBOARD METRICS FROM POSTGRESQL
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (isProductionMode()) {
      if (!isPostgresConfigured() || !prisma) {
        throw new DatabaseConfigurationError('Super Admin metrics require active PostgreSQL in production.');
      }
      // Run genuine parallel queries against PostgreSQL without fake catch fallbacks
      const [
        tenantsCount,
        activeTenantsCount,
        activeLicensesCount,
        trialLicensesCount,
        expiredLicensesCount,
        cancelledSubscriptionsCount,
        activeSubscriptionsCount,
        failedPaymentsCount,
        allActiveLicenses,
        allActiveSubscriptions,
        totalUsersCount,
        allCompletedPayments
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: 'active' } }),
        prisma.license.count({ where: { status: 'ACTIVE' } }),
        prisma.license.count({ where: { status: 'TRIAL' } }),
        prisma.license.count({ where: { status: 'EXPIRED' } }),
        prisma.subscription.count({ where: { status: 'CANCELLED' } }),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.payment.count({ where: { status: 'FAILED' } }),
        prisma.license.findMany({
          where: { status: 'ACTIVE' },
          select: { price: true, billingPeriod: true }
        }),
        prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          select: { amount: true, billingPeriod: true }
        }),
        prisma.user.count(),
        prisma.payment.findMany({
          where: { status: 'COMPLETED' },
          select: { amount: true }
        })
      ]);

      let calculatedMrr = 0;
      if (Array.isArray(allActiveLicenses)) {
        allActiveLicenses.forEach((lic: any) => {
          const price = Number(lic.price || 0);
          const period = lic.billingPeriod || 'monthly';
          calculatedMrr += period === 'yearly' ? (price / 12) : price;
        });
      }

      if (Array.isArray(allActiveSubscriptions)) {
        allActiveSubscriptions.forEach((sub: any) => {
          const amount = Number(sub.amount || 0);
          const period = sub.billingPeriod || 'monthly';
          calculatedMrr += period === 'yearly' ? (amount / 12) : amount;
        });
      }

      const mrr = Math.round(calculatedMrr * 100) / 100;
      const arr = Math.round(mrr * 12 * 100) / 100;
      const totalRevenue = (allCompletedPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      return {
        mrr,
        arr,
        tenants: Number(tenantsCount ?? 0),
        activeLicenses: Number(activeLicensesCount ?? 0),
        trialLicenses: Number(trialLicensesCount ?? 0),
        expiredLicenses: Number(expiredLicensesCount ?? 0),
        cancelledSubscriptions: Number(cancelledSubscriptionsCount ?? 0),
        failedPayments: Number(failedPaymentsCount ?? 0),
        currency: 'EUR',
        totalUsers: Number(totalUsersCount ?? 0),
        activeSubscriptions: Number(activeSubscriptionsCount ?? 0),
        totalInvoices: Number(tenantsCount ?? 0),
        revenueTotal: Math.round(totalRevenue * 100) / 100
      };
    }

    try {
      if (prisma && isPostgresConfigured()) {
        const [
          tenantsCount,
          activeTenantsCount,
          activeLicensesCount,
          trialLicensesCount,
          expiredLicensesCount,
          cancelledSubscriptionsCount,
          activeSubscriptionsCount,
          failedPaymentsCount,
          allActiveLicenses,
          allActiveSubscriptions,
          totalUsersCount,
          allCompletedPayments
        ] = await Promise.all([
          prisma.tenant?.count().catch(() => 0),
          prisma.tenant?.count({ where: { status: 'active' } }).catch(() => 0),
          prisma.license?.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
          prisma.license?.count({ where: { status: 'TRIAL' } }).catch(() => 0),
          prisma.license?.count({ where: { status: 'EXPIRED' } }).catch(() => 0),
          prisma.subscription?.count({ where: { status: 'CANCELLED' } }).catch(() => 0),
          prisma.subscription?.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
          prisma.payment?.count({ where: { status: 'FAILED' } }).catch(() => 0),
          prisma.license?.findMany({
            where: { status: 'ACTIVE' },
            select: { price: true, billingPeriod: true }
          }).catch(() => []),
          prisma.subscription?.findMany({
            where: { status: 'ACTIVE' },
            select: { amount: true, billingPeriod: true }
          }).catch(() => []),
          prisma.user?.count().catch(() => 0),
          prisma.payment?.findMany({
            where: { status: 'COMPLETED' },
            select: { amount: true }
          }).catch(() => [])
        ]);

        let calculatedMrr = 0;
        if (Array.isArray(allActiveLicenses)) {
          allActiveLicenses.forEach((lic: any) => {
            const price = Number(lic.price || 0);
            const period = lic.billingPeriod || 'monthly';
            calculatedMrr += period === 'yearly' ? (price / 12) : price;
          });
        }
        if (Array.isArray(allActiveSubscriptions)) {
          allActiveSubscriptions.forEach((sub: any) => {
            const amount = Number(sub.amount || 0);
            const period = sub.billingPeriod || 'monthly';
            calculatedMrr += period === 'yearly' ? (amount / 12) : amount;
          });
        }

        const mrr = Math.round(calculatedMrr * 100) / 100;
        const arr = Math.round(mrr * 12 * 100) / 100;
        const totalRevenue = (allCompletedPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        return {
          mrr,
          arr,
          tenants: Number(tenantsCount ?? 0),
          activeLicenses: Number(activeLicensesCount ?? 0),
          trialLicenses: Number(trialLicensesCount ?? 0),
          expiredLicenses: Number(expiredLicensesCount ?? 0),
          cancelledSubscriptions: Number(cancelledSubscriptionsCount ?? 0),
          failedPayments: Number(failedPaymentsCount ?? 0),
          currency: 'EUR',
          totalUsers: Number(totalUsersCount ?? 0),
          activeSubscriptions: Number(activeSubscriptionsCount ?? 0),
          totalInvoices: Number(tenantsCount ?? 0),
          revenueTotal: Math.round(totalRevenue * 100) / 100
        };
      }
    } catch (e) {
      console.error('PostgreSQL getDashboardMetrics error in dev:', e);
    }

    // Fallback calculation ONLY for offline development without DB
    const activeLics = INITIAL_LICENSES.filter(l => l.status === 'active');
    const mrr = activeLics.reduce((sum, l) => sum + (l.billingPeriod === 'yearly' ? l.price / 12 : l.price), 0);
    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      tenants: INITIAL_TENANTS.length,
      activeLicenses: activeLics.length,
      trialLicenses: 1,
      expiredLicenses: 1,
      cancelledSubscriptions: 0,
      failedPayments: 0,
      currency: 'EUR',
      totalUsers: 4,
      activeSubscriptions: 3,
      totalInvoices: 3,
      revenueTotal: 1580
    };
  }

  /**
   * 2. APPLICATIONS FROM POSTGRESQL
   */
  static async getApplications() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getApplications requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).application?.findMany === 'function') {
        const apps = await (prisma as any).application.findMany({
          include: {
            modules: true,
            plans: {
              include: { entitlements: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        });
        if (apps) return apps;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getApplications error:', e);
    }
    if (isProductionMode()) return [];
    return INITIAL_APPLICATIONS;
  }

  /**
   * 3. PLANS FROM POSTGRESQL
   */
  static async getPlans(applicationId?: string) {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getPlans requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).plan?.findMany === 'function') {
        const where: any = {};
        if (applicationId) where.applicationId = applicationId;
        const plans = await (prisma as any).plan.findMany({
          where,
          include: {
            entitlements: true,
            application: true
          },
          orderBy: { monthlyPrice: 'asc' }
        });
        if (plans) return plans;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getPlans error:', e);
    }
    if (isProductionMode()) return [];
    return applicationId ? INITIAL_PLANS.filter(p => p.applicationId === applicationId) : INITIAL_PLANS;
  }

  /**
   * 4. ENTITLEMENTS FROM POSTGRESQL
   */
  static async getEntitlements() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getEntitlements requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).planEntitlement?.findMany === 'function') {
        const entitlements = await (prisma as any).planEntitlement.findMany({
          include: {
            plan: {
              select: { id: true, name: true, slug: true, applicationId: true }
            }
          },
          orderBy: { key: 'asc' }
        });
        if (entitlements) return entitlements;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getEntitlements error:', e);
    }
    if (isProductionMode()) return [];
    return [
      { id: 'ent_1', planId: 'plan_pro', key: 'products.max', value: '10000', type: 'NUMBER' },
      { id: 'ent_2', planId: 'plan_pro', key: 'storage.max_mb', value: '25000', type: 'NUMBER' },
      { id: 'ent_3', planId: 'plan_pro', key: 'domains.max', value: '5', type: 'NUMBER' },
      { id: 'ent_4', planId: 'plan_pro', key: 'ai.enabled', value: 'true', type: 'BOOLEAN' },
      { id: 'ent_5', planId: 'plan_pro', key: 'pos.enabled', value: 'true', type: 'BOOLEAN' },
      { id: 'ent_6', planId: 'plan_pro', key: 'correos.enabled', value: 'true', type: 'BOOLEAN' }
    ];
  }

  /**
   * 5. LICENSES FROM POSTGRESQL
   */
  static async getLicenses(filters?: { status?: string; tenantId?: string }) {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getLicenses requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).license?.findMany === 'function') {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.tenantId) where.tenantId = filters.tenantId;

        const lics = await (prisma as any).license.findMany({
          where,
          include: {
            tenant: true,
            application: true,
            plan: true,
            activations: true
          },
          orderBy: { createdAt: 'desc' }
        });
        if (lics) {
          return lics.map((l: any) => ({
            id: l.id,
            licenseKey: l.displayKey,
            displayKey: l.displayKey,
            tenantId: l.tenantId,
            tenantName: l.tenant?.name || l.customerName,
            tenantSlug: l.tenant?.slug || '',
            applicationId: l.applicationId,
            planId: l.planId,
            planName: l.plan?.name || 'Pro',
            status: l.status.toLowerCase(),
            validFrom: l.startsAt?.toISOString() || l.createdAt.toISOString(),
            validTo: l.expiresAt?.toISOString() || new Date().toISOString(),
            customerName: l.customerName,
            customerEmail: l.customerEmail,
            price: l.price,
            billingPeriod: l.billingPeriod,
            activationLimit: l.activationLimit || 1,
            activationCount: l.activations?.length || 0,
            activations: l.activations || []
          }));
        }
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getLicenses error:', e);
    }
    if (isProductionMode()) return [];
    return INITIAL_LICENSES;
  }

  /**
   * 6. ACTIVATIONS FROM POSTGRESQL
   */
  static async getActivations() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getActivations requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).licenseActivation?.findMany === 'function') {
        const activations = await (prisma as any).licenseActivation.findMany({
          include: {
            license: {
              select: { displayKey: true, customerName: true, customerEmail: true, status: true }
            }
          },
          orderBy: { activatedAt: 'desc' }
        });
        if (activations) return activations;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getActivations error:', e);
    }
    if (isProductionMode()) return [];
    return [
      {
        id: 'act_1',
        licenseId: 'lic_valencia',
        displayKey: 'FNX-ECOM-PRO-8899-VAL',
        tenantId: 'tenant_boutiquevalencia',
        domain: 'boutiquevalencia.fenixcms.com',
        environment: 'production',
        ipAddress: '185.120.44.12',
        status: 'ACTIVE',
        activatedAt: '2026-01-10T10:00:00Z'
      },
      {
        id: 'act_2',
        licenseId: 'lic_tech',
        displayKey: 'FNX-ECOM-ENT-1122-MAD',
        tenantId: 'tenant_tienda_madrid',
        domain: 'techmadrid.fenixcms.com',
        environment: 'production',
        ipAddress: '194.224.110.5',
        status: 'ACTIVE',
        activatedAt: '2026-02-01T14:30:00Z'
      }
    ];
  }

  /**
   * 7. SUBSCRIPTIONS FROM POSTGRESQL
   */
  static async getSubscriptions() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getSubscriptions requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).subscription?.findMany === 'function') {
        const subs = await (prisma as any).subscription.findMany({
          include: {
            tenant: true,
            plan: true,
            licenses: true,
            payments: true
          },
          orderBy: { createdAt: 'desc' }
        });
        if (subs) return subs;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getSubscriptions error:', e);
    }
    if (isProductionMode()) return [];
    return [];
  }

  /**
   * 8. PAYMENTS FROM POSTGRESQL
   */
  static async getPayments() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getPayments requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).payment?.findMany === 'function') {
        const payments = await (prisma as any).payment.findMany({
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            subscription: { select: { id: true, planId: true } },
            invoice: { select: { invoiceNumber: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (payments) return payments;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getPayments error:', e);
    }
    if (isProductionMode()) return [];
    return [];
  }

  /**
   * 9. INVOICES FROM POSTGRESQL
   */
  static async getInvoices() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getInvoices requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).invoice?.findMany === 'function') {
        const invoices = await (prisma as any).invoice.findMany({
          include: {
            tenant: { select: { id: true, name: true, slug: true } }
          },
          orderBy: { issuedAt: 'desc' }
        });
        if (invoices) return invoices;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getInvoices error:', e);
    }
    if (isProductionMode()) return [];
    return [];
  }

  /**
   * 10. TENANTS FROM POSTGRESQL
   */
  static async getTenants() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getTenants requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).tenant?.findMany === 'function') {
        const tenants = await (prisma as any).tenant.findMany({
          include: {
            domains: true,
            licenses: true,
            subscriptions: true,
            _count: {
              select: {
                products: true,
                orders: true,
                customers: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (tenants) return tenants;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getTenants error:', e);
    }
    if (isProductionMode()) return [];
    return INITIAL_TENANTS;
  }

  /**
   * 11. DOMAINS FROM POSTGRESQL
   */
  static async getDomains() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getDomains requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).domain?.findMany === 'function') {
        const domains = await (prisma as any).domain.findMany({
          include: {
            tenant: { select: { id: true, name: true, slug: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (domains) return domains;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getDomains error:', e);
    }
    if (isProductionMode()) return [];
    return [];
  }

  /**
   * 12. THEMES FROM POSTGRESQL
   */
  static async getThemes() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getThemes requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).theme?.findMany === 'function') {
        const themes = await (prisma as any).theme.findMany({
          include: {
            installations: {
              include: { tenant: { select: { id: true, name: true, slug: true } } }
            }
          },
          orderBy: { name: 'asc' }
        });
        if (themes) return themes;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getThemes error:', e);
    }
    if (isProductionMode()) return [];
    return INITIAL_THEMES;
  }

  /**
   * 13. PLUGINS FROM POSTGRESQL
   */
  static async getPlugins() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getPlugins requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).plugin?.findMany === 'function') {
        const plugins = await (prisma as any).plugin.findMany({
          include: {
            installations: {
              include: { tenant: { select: { id: true, name: true, slug: true } } }
            }
          },
          orderBy: { name: 'asc' }
        });
        if (plugins) return plugins;
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getPlugins error:', e);
    }
    if (isProductionMode()) return [];
    return INITIAL_PLUGINS;
  }

  /**
   * 14. USERS FROM POSTGRESQL
   */
  static async getUsers() {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('getUsers requires PostgreSQL in production mode.');
    }
    try {
      if (prisma && typeof (prisma as any).user?.findMany === 'function') {
        const users = await (prisma as any).user.findMany({
          include: {
            memberships: {
              include: { tenant: { select: { id: true, name: true, slug: true } } }
            },
            _count: { select: { sessions: true, auditLogs: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (users) {
          return users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            avatarUrl: u.avatarUrl,
            tenants: u.memberships?.map((m: any) => m.tenant?.name).filter(Boolean) || [],
            createdAt: u.createdAt.toISOString(),
            lastActive: u.updatedAt?.toISOString()
          }));
        }
      }
    } catch (e) {
      if (isProductionMode()) throw e;
      console.error('PostgreSQL getUsers error:', e);
    }
    if (isProductionMode()) return [];
    return [];
  }

  /**
   * 15. AUDIT LOGS FROM POSTGRESQL
   */
  static async getAuditLogs(limit: number = 50) {
    try {
      if (prisma && typeof (prisma as any).auditLog?.findMany === 'function') {
        const logs = await (prisma as any).auditLog.findMany({
          take: limit,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            tenant: { select: { id: true, name: true, slug: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (logs && logs.length > 0) return logs;
      }
    } catch (e) {
      console.error('PostgreSQL getAuditLogs error:', e);
    }
    return AuditService.getLogs({ limit });
  }

  /**
   * 16. PERSISTENT PLATFORM SETTINGS (PostgreSQL)
   */
  static async getSettings(): Promise<PlatformSettings> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('Platform settings require PostgreSQL in production mode.');
    }

    if (isPostgresConfigured() && prisma?.platformSetting) {
      try {
        const record = await prisma.platformSetting.findUnique({
          where: { key: 'global_platform_settings' }
        });
        if (record && record.value && typeof record.value === 'object') {
          return {
            ...this.defaultSettings,
            ...(record.value as any),
            updatedAt: record.updatedAt.toISOString()
          };
        }
      } catch (err: any) {
        if (isProductionMode()) throw err;
        console.warn('PostgreSQL getSettings error:', err);
      }
    }

    return this.defaultSettings;
  }

  static async updateSettings(updates: Partial<PlatformSettings>): Promise<PlatformSettings> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('Platform settings require PostgreSQL in production mode.');
    }

    const current = await this.getSettings();
    const merged: PlatformSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (isPostgresConfigured() && prisma?.platformSetting) {
      try {
        await prisma.platformSetting.upsert({
          where: { key: 'global_platform_settings' },
          update: {
            value: merged as any
          },
          create: {
            key: 'global_platform_settings',
            value: merged as any
          }
        });

        AuditService.log({
          action: 'PLATFORM_SETTINGS_UPDATED',
          entity: 'PlatformSettings',
          details: updates
        });

        return merged;
      } catch (err: any) {
        if (isProductionMode()) throw err;
        console.warn('PostgreSQL updateSettings error:', err);
      }
    }

    this.defaultSettings = merged;
    AuditService.log({
      action: 'PLATFORM_SETTINGS_UPDATED',
      entity: 'PlatformSettings',
      details: updates
    });
    return this.defaultSettings;
  }

  /**
   * USER MUTATIONS (Super Admin operations)
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    try {
      if (prisma && typeof (prisma as any).user?.update === 'function') {
        await (prisma as any).user.update({
          where: { id: userId },
          data: { role: newRole }
        });
        AuditService.log({
          action: 'USER_ROLE_CHANGED',
          entity: 'User',
          entityId: userId,
          details: { newRole }
        });
        return true;
      }
    } catch (e) {
      console.error('PostgreSQL updateUserRole error:', e);
    }
    return false;
  }

  static async updateUserStatus(userId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'): Promise<boolean> {
    try {
      if (prisma && typeof (prisma as any).user?.update === 'function') {
        await (prisma as any).user.update({
          where: { id: userId },
          data: { status: newStatus }
        });
        AuditService.log({
          action: 'USER_STATUS_CHANGED',
          entity: 'User',
          entityId: userId,
          details: { newStatus }
        });
        return true;
      }
    } catch (e) {
      console.error('PostgreSQL updateUserStatus error:', e);
    }
    return false;
  }

  /**
   * TENANT STATUS MUTATION
   */
  static async updateTenantStatus(tenantId: string, status: 'active' | 'suspended' | 'trial' | 'expired'): Promise<boolean> {
    try {
      if (prisma && typeof (prisma as any).tenant?.update === 'function') {
        await (prisma as any).tenant.update({
          where: { id: tenantId },
          data: { status }
        });
        AuditService.log({
          action: 'TENANT_STATUS_CHANGED',
          entity: 'Tenant',
          entityId: tenantId,
          details: { status }
        });
        return true;
      }
    } catch (e) {
      console.error('PostgreSQL updateTenantStatus error:', e);
    }
    return false;
  }
}

