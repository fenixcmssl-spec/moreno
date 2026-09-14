import { prisma, isPostgresConfigured, isProductionMode, DatabaseConfigurationError } from '@/lib/prisma';
import { SaaSPlan, PlanEntitlements, EntityStatus } from '@/types';
import { INITIAL_PLANS } from '@/lib/initialData';

export class PlanService {
  /**
   * Helper to map Prisma Plan model to SaaSPlan interface with full backwards compatibility
   */
  public static mapPrismaToSaaSPlan(plan: any, activeLicensesCount = 0): SaaSPlan {
    const entitlementsObj: PlanEntitlements = {};
    if (plan.entitlements && Array.isArray(plan.entitlements)) {
      for (const ent of plan.entitlements) {
        if (ent.type === 'NUMBER') {
          entitlementsObj[ent.key] = Number(ent.value);
        } else if (ent.type === 'BOOLEAN') {
          entitlementsObj[ent.key] = ent.value === 'true';
        } else if (ent.type === 'ARRAY') {
          try {
            entitlementsObj[ent.key] = JSON.parse(ent.value);
          } catch {
            entitlementsObj[ent.key] = [ent.value];
          }
        } else {
          entitlementsObj[ent.key] = ent.value;
        }
      }
    }

    const monthlyPrice = Number(plan.monthlyPrice ?? 0);
    const yearlyPrice = Number(plan.yearlyPrice ?? 0);

    return {
      id: plan.id,
      applicationId: plan.applicationId,
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      monthlyPrice,
      yearlyPrice,
      priceMonthly: monthlyPrice,
      priceYearly: yearlyPrice,
      currency: plan.currency || 'EUR',
      trialDays: Number(plan.trialDays ?? 14),
      status: (plan.status as EntityStatus) || 'ACTIVE',
      badge: plan.badge || undefined,
      imageUrl: plan.imageUrl || undefined,
      popular: Boolean(plan.popular),
      features: Array.isArray(plan.features) ? plan.features : [],
      entitlements: entitlementsObj,
      maxProducts: entitlementsObj['products.max'] ? Number(entitlementsObj['products.max']) : undefined,
      maxStorageMb: entitlementsObj['storage.max_mb'] ? Number(entitlementsObj['storage.max_mb']) : 5000,
      customDomainAllowed: entitlementsObj['domains.max'] ? Number(entitlementsObj['domains.max']) > 0 : true,
      createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : new Date().toISOString(),
      _count: {
        licenses: plan._count?.licenses ?? 0,
        subscriptions: plan._count?.subscriptions ?? 0,
        activeLicenses: activeLicensesCount
      }
    };
  }

  /**
   * Resolves or ensures a valid Application ID in PostgreSQL
   */
  private static async resolveApplicationId(appIdOrKey: string): Promise<string> {
    if (!isPostgresConfigured() || !prisma?.application) {
      return appIdOrKey;
    }

    const app = await prisma.application.findFirst({
      where: {
        OR: [
          { id: appIdOrKey },
          { key: appIdOrKey },
          { slug: appIdOrKey }
        ]
      }
    });

    if (app) {
      return app.id;
    }

    const firstApp = await prisma.application.findFirst();
    if (firstApp) {
      return firstApp.id;
    }

    const createdApp = await prisma.application.create({
      data: {
        key: 'ECOMMERCE',
        name: 'Fenix E-commerce Pro',
        slug: 'ecommerce',
        description: 'Plataforma completa de comercio electrónico',
        status: 'ACTIVE'
      }
    });

    return createdApp.id;
  }

  /**
   * Retrieves all SaaS plans from PostgreSQL with entitlements included
   */
  static async getAll(options?: { applicationId?: string; status?: string; search?: string }): Promise<SaaSPlan[]> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.plan?.findMany) {
      const where: any = {};
      if (options?.status) {
        where.status = options.status.toUpperCase();
      }
      if (options?.applicationId) {
        where.OR = [
          { applicationId: options.applicationId },
          { application: { key: options.applicationId.toUpperCase() } },
          { application: { slug: options.applicationId.toLowerCase() } }
        ];
      }
      if (options?.search) {
        where.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { slug: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } }
        ];
      }

      const dbPlans = await prisma.plan.findMany({
        where,
        include: {
          entitlements: true,
          _count: {
            select: {
              licenses: true,
              subscriptions: true
            }
          }
        },
        orderBy: { monthlyPrice: 'asc' }
      });

      if (dbPlans && dbPlans.length > 0) {
        return dbPlans.map(p => this.mapPrismaToSaaSPlan(p));
      }

      if (isProductionMode()) {
        return [];
      }
    }

    // Fallback for development/test only
    let plans = [...INITIAL_PLANS];
    if (options?.applicationId) {
      plans = plans.filter(p => p.applicationId === options.applicationId || p.applicationId === 'ECOMMERCE');
    }
    if (options?.status) {
      plans = plans.filter(p => p.status.toLowerCase() === options.status?.toLowerCase());
    }
    return plans;
  }

  /**
   * Retrieves a single SaaS plan by unique ID
   */
  static async getById(id: string): Promise<SaaSPlan | null> {
    if (!id) return null;

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.plan?.findUnique) {
      const dbPlan = await prisma.plan.findUnique({
        where: { id },
        include: {
          entitlements: true,
          _count: {
            select: {
              licenses: true,
              subscriptions: true
            }
          }
        }
      });

      if (dbPlan) {
        return this.mapPrismaToSaaSPlan(dbPlan);
      }

      if (isProductionMode()) {
        return null;
      }
    }

    return INITIAL_PLANS.find(p => p.id === id) || null;
  }

  /**
   * Retrieves a single SaaS plan by unique URL slug
   */
  static async getBySlug(slug: string): Promise<SaaSPlan | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();

    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.plan?.findUnique) {
      const dbPlan = await prisma.plan.findUnique({
        where: { slug: cleanSlug },
        include: {
          entitlements: true,
          _count: {
            select: {
              licenses: true,
              subscriptions: true
            }
          }
        }
      });

      if (dbPlan) {
        return this.mapPrismaToSaaSPlan(dbPlan);
      }

      if (isProductionMode()) {
        return null;
      }
    }

    return INITIAL_PLANS.find(p => p.slug.toLowerCase() === cleanSlug) || null;
  }

  /**
   * Creates a new SaaS plan with full transactional entitlement synchronization in PostgreSQL
   */
  static async create(data: {
    name: string;
    slug?: string;
    applicationId?: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency?: string;
    trialDays?: number;
    popular?: boolean;
    badge?: string;
    imageUrl?: string;
    features?: string[];
    entitlements?: Record<string, any>;
    status?: EntityStatus;
  }): Promise<SaaSPlan> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    const rawSlug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = rawSlug.toLowerCase().replace(/^-+|-+$/g, '');

    const resolvedAppId = await this.resolveApplicationId(data.applicationId || 'ECOMMERCE');

    if (isPostgresConfigured() && prisma?.plan) {
      const created = await prisma.$transaction(async (tx: any) => {
        const plan = await tx.plan.create({
          data: {
            name: data.name.trim(),
            slug,
            applicationId: resolvedAppId,
            description: data.description || '',
            monthlyPrice: Number(data.monthlyPrice || 0),
            yearlyPrice: Number(data.yearlyPrice || 0),
            currency: data.currency || 'EUR',
            trialDays: Number(data.trialDays ?? 14),
            popular: Boolean(data.popular),
            badge: data.badge || null,
            imageUrl: data.imageUrl || null,
            features: Array.isArray(data.features) ? data.features : [],
            status: (data.status || 'ACTIVE').toUpperCase()
          }
        });

        if (data.entitlements && typeof data.entitlements === 'object') {
          const entitlementRecords = Object.entries(data.entitlements).map(([key, val]) => {
            let type = 'STRING';
            let valueStr = String(val);

            if (typeof val === 'number') {
              type = 'NUMBER';
            } else if (typeof val === 'boolean') {
              type = 'BOOLEAN';
              valueStr = val ? 'true' : 'false';
            } else if (Array.isArray(val) || typeof val === 'object') {
              type = 'ARRAY';
              valueStr = JSON.stringify(val);
            }

            return {
              planId: plan.id,
              key,
              value: valueStr,
              type
            };
          });

          if (entitlementRecords.length > 0) {
            await tx.planEntitlement.createMany({
              data: entitlementRecords
            });
          }
        }

        return tx.plan.findUnique({
          where: { id: plan.id },
          include: { entitlements: true }
        });
      });

      return this.mapPrismaToSaaSPlan(created);
    }

    throw new DatabaseConfigurationError('Database is not available for plan creation.');
  }

  /**
   * Updates an existing SaaS plan and its entitlements in PostgreSQL
   */
  static async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      applicationId?: string;
      description?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      currency?: string;
      trialDays?: number;
      popular?: boolean;
      badge?: string;
      imageUrl?: string;
      features?: string[];
      entitlements?: Record<string, any>;
      status?: EntityStatus;
    }
  ): Promise<SaaSPlan | null> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.plan) {
      const existing = await prisma.plan.findUnique({ where: { id } });
      if (!existing) return null;

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.slug !== undefined) updateData.slug = data.slug.trim().toLowerCase();
      if (data.description !== undefined) updateData.description = data.description;
      if (data.monthlyPrice !== undefined) updateData.monthlyPrice = Number(data.monthlyPrice);
      if (data.yearlyPrice !== undefined) updateData.yearlyPrice = Number(data.yearlyPrice);
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.trialDays !== undefined) updateData.trialDays = Number(data.trialDays);
      if (data.popular !== undefined) updateData.popular = Boolean(data.popular);
      if (data.badge !== undefined) updateData.badge = data.badge;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.features !== undefined) updateData.features = data.features;
      if (data.status !== undefined) updateData.status = data.status.toUpperCase();
      if (data.applicationId) {
        updateData.applicationId = await this.resolveApplicationId(data.applicationId);
      }

      const updated = await prisma.$transaction(async (tx: any) => {
        await tx.plan.update({
          where: { id },
          data: updateData
        });

        if (data.entitlements && typeof data.entitlements === 'object') {
          await tx.planEntitlement.deleteMany({
            where: { planId: id }
          });

          const entitlementRecords = Object.entries(data.entitlements).map(([key, val]) => {
            let type = 'STRING';
            let valueStr = String(val);

            if (typeof val === 'number') {
              type = 'NUMBER';
            } else if (typeof val === 'boolean') {
              type = 'BOOLEAN';
              valueStr = val ? 'true' : 'false';
            } else if (Array.isArray(val) || typeof val === 'object') {
              type = 'ARRAY';
              valueStr = JSON.stringify(val);
            }

            return {
              planId: id,
              key,
              value: valueStr,
              type
            };
          });

          if (entitlementRecords.length > 0) {
            await tx.planEntitlement.createMany({
              data: entitlementRecords
            });
          }
        }

        return tx.plan.findUnique({
          where: { id },
          include: {
            entitlements: true,
            _count: {
              select: {
                licenses: true,
                subscriptions: true
              }
            }
          }
        });
      });

      return updated ? this.mapPrismaToSaaSPlan(updated) : null;
    }

    return null;
  }

  /**
   * Duplicates an existing SaaS plan and its entitlements in PostgreSQL
   */
  static async duplicate(id: string): Promise<SaaSPlan | null> {
    const original = await this.getById(id);
    if (!original) return null;

    const newSlug = `${original.slug}-copy-${Date.now().toString(36)}`;
    const newName = `${original.name} (Copia)`;

    return this.create({
      name: newName,
      slug: newSlug,
      applicationId: original.applicationId,
      description: original.description,
      monthlyPrice: original.priceMonthly ?? (original as any).price ?? 0,
      yearlyPrice: original.priceYearly ?? (original as any).yearlyPrice ?? 0,
      currency: original.currency,
      trialDays: original.trialDays,
      popular: false,
      status: 'ACTIVE',
      features: original.features,
      entitlements: original.entitlements
    });
  }

  /**
   * Checks if a plan can be safely deleted or if active tenants/licenses depend on it
   */
  static async canDelete(id: string): Promise<{ canDelete: boolean; activeLicensesCount: number; reason?: string }> {
    if (isPostgresConfigured() && prisma?.license?.count) {
      const activeLicensesCount = await prisma.license.count({
        where: {
          planId: id,
          status: { in: ['ACTIVE', 'TRIAL'] }
        }
      });

      if (activeLicensesCount > 0) {
        return {
          canDelete: false,
          activeLicensesCount,
          reason: `No se puede eliminar el plan porque existen ${activeLicensesCount} licencias activas asociadas.`
        };
      }

      return { canDelete: true, activeLicensesCount: 0 };
    }

    return { canDelete: true, activeLicensesCount: 0 };
  }

  /**
   * Updates status of a plan
   */
  static async setStatus(id: string, status: string): Promise<SaaSPlan | null> {
    return this.update(id, { status: status as any });
  }

  /**
   * Deactivates or archives a SaaS plan in PostgreSQL
   */
  static async delete(id: string): Promise<boolean> {
    if (isProductionMode() && !isPostgresConfigured()) {
      throw new DatabaseConfigurationError('PostgreSQL is required in production.');
    }

    if (isPostgresConfigured() && prisma?.plan?.delete) {
      await prisma.plan.delete({
        where: { id }
      });
      return true;
    }

    return false;
  }
}
