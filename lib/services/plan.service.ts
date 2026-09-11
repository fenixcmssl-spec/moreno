import { prisma } from '@/lib/prisma';
import { SaaSPlan, PlanEntitlements, EntityStatus } from '@/types';
import { INITIAL_PLANS } from '@/lib/initialData';

export class PlanService {
  /**
   * Helper to map Prisma Plan model to SaaSPlan interface with full backwards compatibility
   */
  private static mapPrismaToSaaSPlan(plan: any, activeLicensesCount = 0): SaaSPlan {
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
    if (!prisma?.application) {
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

    // Fallback: lookup first application
    const firstApp = await prisma.application.findFirst();
    if (firstApp) {
      return firstApp.id;
    }

    // If no applications in DB, create default ECOMMERCE application
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
   * Retrieves all plans from PostgreSQL with optional filtering
   */
  static async getAll(options?: {
    applicationId?: string;
    status?: string;
    search?: string;
  }): Promise<SaaSPlan[]> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.plan) {
        let plans = [...INITIAL_PLANS];
        if (options?.status) {
          plans = plans.filter(p => (p.status || 'ACTIVE').toLowerCase() === options.status?.toLowerCase());
        }
        if (options?.applicationId) {
          const targetAppId = options.applicationId;
          plans = plans.filter(p => p.applicationId === targetAppId || (p.slug && p.slug.includes(targetAppId)));
        }
        if (options?.search) {
          const q = options.search.toLowerCase();
          plans = plans.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
        }
        return plans;
      }

      await this.ensureSeedPlans();

      const where: any = {};
      if (options?.status) {
        where.status = options.status;
      }
      if (options?.applicationId) {
        where.OR = [
          { applicationId: options.applicationId },
          { application: { key: options.applicationId } },
          { application: { slug: options.applicationId } }
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
          application: true,
          entitlements: true,
          _count: {
            select: {
              licenses: true,
              subscriptions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Count active licenses for each plan
      const plansWithActiveCount = await Promise.all(
        dbPlans.map(async (p: any) => {
          const activeCount = await prisma.license.count({
            where: {
              planId: p.id,
              status: 'ACTIVE'
            }
          });
          return this.mapPrismaToSaaSPlan(p, activeCount);
        })
      );

      return plansWithActiveCount;
    } catch {
      let plans = [...INITIAL_PLANS];
      if (options?.status) {
        plans = plans.filter(p => (p.status || 'ACTIVE').toLowerCase() === options.status?.toLowerCase());
      }
      if (options?.applicationId) {
        const targetAppId = options.applicationId;
        plans = plans.filter(p => p.applicationId === targetAppId || (p.slug && p.slug.includes(targetAppId)));
      }
      return plans;
    }
  }

  /**
   * Retrieves a single plan by ID from PostgreSQL
   */
  static async getById(id: string): Promise<SaaSPlan | null> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.plan) {
        return INITIAL_PLANS.find(p => p.id === id) || null;
      }

      const plan = await prisma.plan.findUnique({
        where: { id },
        include: {
          application: true,
          entitlements: true,
          _count: {
            select: {
              licenses: true,
              subscriptions: true
            }
          }
        }
      });

      if (!plan) return INITIAL_PLANS.find(p => p.id === id) || null;

      const activeCount = await prisma.license.count({
        where: {
          planId: id,
          status: 'ACTIVE'
        }
      });

      return this.mapPrismaToSaaSPlan(plan, activeCount);
    } catch {
      return INITIAL_PLANS.find(p => p.id === id) || null;
    }
  }

  /**
   * Retrieves a single plan by slug from PostgreSQL
   */
  static async getBySlug(slug: string): Promise<SaaSPlan | null> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.plan) {
        return INITIAL_PLANS.find(p => p.slug.toLowerCase() === slug.toLowerCase()) || null;
      }

      const plan = await prisma.plan.findUnique({
        where: { slug: slug.toLowerCase() },
        include: {
          application: true,
          entitlements: true
        }
      });

      if (!plan) return INITIAL_PLANS.find(p => p.slug.toLowerCase() === slug.toLowerCase()) || null;

      return this.mapPrismaToSaaSPlan(plan);
    } catch {
      return INITIAL_PLANS.find(p => p.slug.toLowerCase() === slug.toLowerCase()) || null;
    }
  }

  /**
   * Retrieves all plans for a specific application
   */
  static async getByApplication(applicationId: string): Promise<SaaSPlan[]> {
    return this.getAll({ applicationId });
  }

  /**
   * Creates a new plan in PostgreSQL
   */
  static async create(data: {
    applicationId: string;
    name: string;
    slug?: string;
    description: string;
    monthlyPrice?: number;
    yearlyPrice?: number;
    priceMonthly?: number;
    priceYearly?: number;
    currency?: string;
    trialDays?: number;
    status?: string;
    badge?: string;
    imageUrl?: string;
    popular?: boolean;
    features?: string[];
    entitlements?: PlanEntitlements;
  }): Promise<SaaSPlan> {
    const validAppId = await this.resolveApplicationId(data.applicationId);
    const mPrice = Number(data.monthlyPrice ?? data.priceMonthly ?? 0);
    const yPrice = Number(data.yearlyPrice ?? data.priceYearly ?? (mPrice * 10));
    
    let baseSlug = (data.slug || data.name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = `plan-${Date.now()}`;

    // Verify slug uniqueness in PostgreSQL
    let uniqueSlug = baseSlug;
    let count = 1;
    while (await prisma.plan.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    const created = await prisma.plan.create({
      data: {
        applicationId: validAppId,
        name: data.name.trim(),
        slug: uniqueSlug,
        description: data.description || '',
        monthlyPrice: mPrice,
        yearlyPrice: yPrice,
        currency: data.currency || 'EUR',
        trialDays: Number(data.trialDays ?? 14),
        status: data.status || 'ACTIVE',
        badge: data.badge || null,
        imageUrl: data.imageUrl || null,
        popular: Boolean(data.popular),
        features: Array.isArray(data.features) ? data.features : [],
        entitlements: {
          create: data.entitlements ? Object.entries(data.entitlements).map(([key, val]) => {
            let type = 'STRING';
            let valStr = String(val);
            if (typeof val === 'number') {
              type = 'NUMBER';
            } else if (typeof val === 'boolean') {
              type = 'BOOLEAN';
            } else if (Array.isArray(val) || typeof val === 'object') {
              type = 'ARRAY';
              valStr = JSON.stringify(val);
            }
            return {
              key,
              value: valStr,
              type
            };
          }) : []
        }
      },
      include: {
        application: true,
        entitlements: true
      }
    });

    return this.mapPrismaToSaaSPlan(created, 0);
  }

  /**
   * Updates an existing plan in PostgreSQL
   */
  static async update(
    id: string,
    data: {
      applicationId?: string;
      name?: string;
      slug?: string;
      description?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      priceMonthly?: number;
      priceYearly?: number;
      currency?: string;
      trialDays?: number;
      status?: string;
      badge?: string;
      imageUrl?: string;
      popular?: boolean;
      features?: string[];
      entitlements?: PlanEntitlements;
    }
  ): Promise<SaaSPlan | null> {
    const existing = await prisma.plan.findUnique({
      where: { id },
      include: { entitlements: true }
    });

    if (!existing) return null;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.trialDays !== undefined) updateData.trialDays = Number(data.trialDays);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.popular !== undefined) updateData.popular = Boolean(data.popular);
    if (data.features !== undefined) updateData.features = Array.isArray(data.features) ? data.features : [];

    if (data.monthlyPrice !== undefined || data.priceMonthly !== undefined) {
      updateData.monthlyPrice = Number(data.monthlyPrice ?? data.priceMonthly);
    }
    if (data.yearlyPrice !== undefined || data.priceYearly !== undefined) {
      updateData.yearlyPrice = Number(data.yearlyPrice ?? data.priceYearly);
    }

    if (data.slug !== undefined) {
      const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (cleanSlug && cleanSlug !== existing.slug) {
        const slugExists = await prisma.plan.findFirst({
          where: { slug: cleanSlug, NOT: { id } }
        });
        if (!slugExists) {
          updateData.slug = cleanSlug;
        }
      }
    }

    if (data.applicationId !== undefined) {
      updateData.applicationId = await this.resolveApplicationId(data.applicationId);
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.plan.update({
        where: { id },
        data: updateData
      });

      if (data.entitlements !== undefined) {
        await tx.planEntitlement.deleteMany({
          where: { planId: id }
        });

        const entitlementEntries = Object.entries(data.entitlements);
        if (entitlementEntries.length > 0) {
          await tx.planEntitlement.createMany({
            data: entitlementEntries.map(([key, val]) => {
              let type = 'STRING';
              let valStr = String(val);
              if (typeof val === 'number') {
                type = 'NUMBER';
              } else if (typeof val === 'boolean') {
                type = 'BOOLEAN';
              } else if (Array.isArray(val) || typeof val === 'object') {
                type = 'ARRAY';
                valStr = JSON.stringify(val);
              }
              return {
                planId: id,
                key,
                value: valStr,
                type
              };
            })
          });
        }
      }

      return tx.plan.findUnique({
        where: { id },
        include: {
          application: true,
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

    const activeCount = await prisma.license.count({
      where: { planId: id, status: 'ACTIVE' }
    });

    return this.mapPrismaToSaaSPlan(updated, activeCount);
  }

  /**
   * Activates or deactivates a plan in PostgreSQL
   */
  static async setStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<SaaSPlan | null> {
    return this.update(id, { status });
  }

  /**
   * Duplicates an existing plan in PostgreSQL with a unique copy slug
   */
  static async duplicate(id: string): Promise<SaaSPlan> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error(`Plan con ID "${id}" no encontrado en PostgreSQL.`);
    }

    const copyName = `${original.name} (Copia)`;
    const copySlug = `${original.slug}-copia-${Date.now().toString().slice(-4)}`;

    return this.create({
      applicationId: original.applicationId,
      name: copyName,
      slug: copySlug,
      description: original.description,
      monthlyPrice: original.monthlyPrice,
      yearlyPrice: original.yearlyPrice,
      currency: original.currency,
      trialDays: original.trialDays,
      status: 'ACTIVE',
      badge: original.badge ? `${original.badge} (Copia)` : undefined,
      imageUrl: original.imageUrl,
      popular: false,
      features: [...original.features],
      entitlements: original.entitlements ? { ...original.entitlements } : {}
    });
  }

  /**
   * Checks if a plan can be safely deleted (fails if active licenses exist)
   */
  static async canDelete(id: string): Promise<{ canDelete: boolean; activeLicensesCount: number; reason?: string }> {
    const activeLicensesCount = await prisma.license.count({
      where: {
        planId: id,
        status: 'ACTIVE'
      }
    });

    if (activeLicensesCount > 0) {
      return {
        canDelete: false,
        activeLicensesCount,
        reason: `No se puede eliminar el plan porque cuenta con ${activeLicensesCount} licencia(s) activa(s) asociada(s). Suspende o reasigna las licencias antes de eliminar este plan.`
      };
    }

    return {
      canDelete: true,
      activeLicensesCount: 0
    };
  }

  /**
   * Deletes a plan from PostgreSQL strictly if it has no active licenses
   */
  static async delete(id: string): Promise<{ success: boolean; deletedId: string; message: string }> {
    const check = await this.canDelete(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'Restricción de integridad: Este plan tiene licencias activas.');
    }

    // Cascade delete entitlements then plan
    await prisma.$transaction(async (tx: any) => {
      await tx.planEntitlement.deleteMany({
        where: { planId: id }
      });
      await tx.plan.delete({
        where: { id }
      });
    });

    return {
      success: true,
      deletedId: id,
      message: 'Plan eliminado de PostgreSQL con éxito.'
    };
  }

  /**
   * Automatically initializes default plans in PostgreSQL if the table is empty
   */
  static async ensureSeedPlans(): Promise<void> {
    try {
      if (!process.env.DATABASE_URL || !prisma?.plan) return;
      const count = await prisma.plan.count();
      if (count > 0) return;

      const app = await prisma.application.findFirst();
      const defaultAppId = app ? app.id : await this.resolveApplicationId('ECOMMERCE');

      const starterPlan = await prisma.plan.create({
        data: {
          id: 'plan_starter',
          applicationId: defaultAppId,
          name: 'Starter Merchant',
          slug: 'starter-merchant',
          badge: 'Para Emprendedores',
          monthlyPrice: 29,
          yearlyPrice: 290,
          description: 'Ideal para lanzar tu primera tienda online con todas las funciones esenciales.',
          status: 'ACTIVE',
          trialDays: 14,
          features: [
            'Hasta 100 productos activos',
            'Pasarelas: PayPal, Stripe y Transferencia',
            'Plugin de Envíos Correos Express',
            'Importador Fenix All Import Pro',
            'Soporte multi-idioma (6 idiomas)'
          ],
          entitlements: {
            create: [
              { key: 'products.max', value: '100', type: 'NUMBER' },
              { key: 'storage.max_mb', value: '1000', type: 'NUMBER' },
              { key: 'domains.max', value: '1', type: 'NUMBER' },
              { key: 'users.max', value: '2', type: 'NUMBER' },
              { key: 'ai.enabled', value: 'false', type: 'BOOLEAN' }
            ]
          }
        }
      });

      const proPlan = await prisma.plan.create({
        data: {
          id: 'plan_pro',
          applicationId: defaultAppId,
          name: 'Professional Business',
          slug: 'pro-business',
          badge: 'Más Popular',
          monthlyPrice: 79,
          yearlyPrice: 790,
          description: 'La solución definitiva para tiendas en crecimiento con alto volumen de pedidos y analítica.',
          status: 'ACTIVE',
          popular: true,
          trialDays: 14,
          features: [
            'Catálogo de hasta 2.500 productos',
            'IA Gemini: Generación de fichas y SEO',
            'Cupones avanzados y descuentos por volumen',
            'Plugins de Marketplace Ilimitados',
            'Soporte prioritario 24/7'
          ],
          entitlements: {
            create: [
              { key: 'products.max', value: '2500', type: 'NUMBER' },
              { key: 'storage.max_mb', value: '5000', type: 'NUMBER' },
              { key: 'domains.max', value: '3', type: 'NUMBER' },
              { key: 'users.max', value: '10', type: 'NUMBER' },
              { key: 'ai.enabled', value: 'true', type: 'BOOLEAN' }
            ]
          }
        }
      });

      const enterprisePlan = await prisma.plan.create({
        data: {
          id: 'plan_enterprise',
          applicationId: defaultAppId,
          name: 'Enterprise Ultra',
          slug: 'enterprise-ultra',
          badge: 'Máximo Rendimiento',
          monthlyPrice: 199,
          yearlyPrice: 1990,
          description: 'Capacidad sin límites, CDN dedicada, múltiples dominios y personalización completa.',
          status: 'ACTIVE',
          trialDays: 30,
          features: [
            'Productos y transacciones ilimitadas',
            'Múltiples dominios y subdominios personalizados',
            'Acceso a todos los plugins y temas de pago',
            'Backups automáticos diarios en Cloud Storage',
            'Gestor de cuenta y SLA del 99.99%'
          ],
          entitlements: {
            create: [
              { key: 'products.max', value: '999999', type: 'NUMBER' },
              { key: 'storage.max_mb', value: '50000', type: 'NUMBER' },
              { key: 'domains.max', value: '10', type: 'NUMBER' },
              { key: 'users.max', value: '100', type: 'NUMBER' },
              { key: 'ai.enabled', value: 'true', type: 'BOOLEAN' }
            ]
          }
        }
      });

      console.log('✅ Planes por defecto inicializados en PostgreSQL con éxito.');
    } catch (e) {
      console.warn('Advertencia al asegurar seed de planes:', e);
    }
  }
}
