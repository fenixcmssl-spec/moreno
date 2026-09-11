import { prisma } from '@/lib/prisma';
import { SubscriptionRecord, SubscriptionStatusType } from '@/types';
import { LicenseService } from './license.service';

const INITIAL_SUBSCRIPTIONS: SubscriptionRecord[] = [
  {
    id: 'sub_1',
    tenantId: 'tenant_1',
    planId: 'plan_pro',
    provider: 'stripe',
    providerSubscriptionId: 'sub_stripe_12345',
    status: 'ACTIVE',
    billingPeriod: 'monthly',
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    amount: 39,
    currency: 'EUR',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sub_2',
    tenantId: 'tenant_2',
    planId: 'plan_enterprise',
    provider: 'paypal',
    providerSubscriptionId: 'I-BW4556678',
    status: 'ACTIVE',
    billingPeriod: 'monthly',
    currentPeriodStart: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
    amount: 99,
    currency: 'EUR',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let memorySubscriptions: SubscriptionRecord[] = [...INITIAL_SUBSCRIPTIONS];

export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  provider?: 'stripe' | 'paypal' | 'manual' | string;
  providerSubscriptionId?: string;
  billingPeriod?: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
  status?: SubscriptionStatusType;
  trialDays?: number;
}

export class SubscriptionService {
  /**
   * Retrieves all subscriptions (PostgreSQL with fallback)
   */
  static async getAll(options?: { status?: string; tenantId?: string }): Promise<SubscriptionRecord[]> {
    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        const where: any = {};
        if (options?.status) where.status = options.status.toUpperCase();
        if (options?.tenantId) where.tenantId = options.tenantId;

        const dbSubs = await prisma.subscription.findMany({
          where,
          include: {
            plan: true,
            tenant: true
          },
          orderBy: { createdAt: 'desc' }
        });

        if (dbSubs && dbSubs.length > 0) {
          return dbSubs.map((s: any) => this.mapPrismaToSubscription(s));
        }
      }
    } catch {
      // Fallback
    }

    let list = [...memorySubscriptions];
    if (options?.status) {
      list = list.filter(s => s.status.toLowerCase() === options.status?.toLowerCase());
    }
    if (options?.tenantId) {
      list = list.filter(s => s.tenantId === options.tenantId);
    }
    return list;
  }

  /**
   * Retrieves active or latest subscription for a tenant
   */
  static async getByTenantId(tenantId: string): Promise<SubscriptionRecord | null> {
    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        const sub = await prisma.subscription.findFirst({
          where: { tenantId },
          include: {
            plan: true,
            tenant: true
          },
          orderBy: { createdAt: 'desc' }
        });
        if (sub) return this.mapPrismaToSubscription(sub);
      }
    } catch {
      // Fallback
    }

    const found = memorySubscriptions.find(s => s.tenantId === tenantId);
    return found || null;
  }

  /**
   * Retrieves subscription by ID
   */
  static async getById(id: string): Promise<SubscriptionRecord | null> {
    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        const sub = await prisma.subscription.findUnique({
          where: { id },
          include: {
            plan: true,
            tenant: true
          }
        });
        if (sub) return this.mapPrismaToSubscription(sub);
      }
    } catch {
      // Fallback
    }

    const found = memorySubscriptions.find(s => s.id === id);
    return found || null;
  }

  /**
   * Creates a new Subscription and synchronizes linked License
   */
  static async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRecord> {
    const now = new Date();
    const isTrial = (input.trialDays && input.trialDays > 0) || input.status === 'TRIALING';
    const durationDays = isTrial ? (input.trialDays || 14) : (input.billingPeriod === 'yearly' ? 365 : 30);
    
    const periodStart = now;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);

    const newSub: SubscriptionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: input.tenantId,
      planId: input.planId,
      provider: input.provider || 'stripe',
      providerSubscriptionId: input.providerSubscriptionId,
      status: (input.status || (isTrial ? 'TRIALING' : 'ACTIVE')) as SubscriptionStatusType,
      billingPeriod: input.billingPeriod || 'monthly',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      amount: input.amount || 0,
      currency: input.currency || 'EUR',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        const dbCreated = await prisma.subscription.create({
          data: {
            id: newSub.id,
            tenantId: newSub.tenantId,
            planId: newSub.planId,
            provider: newSub.provider,
            providerSubscriptionId: newSub.providerSubscriptionId,
            status: newSub.status as any,
            billingPeriod: newSub.billingPeriod,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            amount: newSub.amount || 0,
            currency: newSub.currency || 'EUR'
          }
        });
        newSub.id = dbCreated.id;
      }
    } catch {
      // Fallback
    }

    memorySubscriptions.unshift(newSub);

    // Sync license active state
    await this.syncLicenseWithSubscription(newSub.id);

    return newSub;
  }

  /**
   * Cancels a subscription
   * Regla:
   * - cancelAtPeriodEnd = true: Keeps subscription active until currentPeriodEnd
   * - cancelAtPeriodEnd = false: Immediate cancellation
   */
  static async cancelSubscription(
    id: string,
    options: { cancelAtPeriodEnd?: boolean; reason?: string } = { cancelAtPeriodEnd: true }
  ): Promise<{ success: boolean; subscription?: SubscriptionRecord; error?: string }> {
    const sub = await this.getById(id);
    if (!sub) return { success: false, error: 'Suscripción no encontrada' };

    const now = new Date();
    const cancelAtPeriodEnd = options.cancelAtPeriodEnd !== false;

    if (cancelAtPeriodEnd) {
      // Mark cancelAtPeriodEnd = true; keeps status ACTIVE until period end
      sub.cancelAtPeriodEnd = true;
      sub.cancelledAt = now.toISOString();
      sub.updatedAt = now.toISOString();
    } else {
      // Immediate cancellation
      sub.status = 'CANCELLED';
      sub.cancelAtPeriodEnd = false;
      sub.cancelledAt = now.toISOString();
      sub.updatedAt = now.toISOString();
    }

    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        await prisma.subscription.update({
          where: { id },
          data: {
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            status: sub.status as any,
            cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt) : null
          }
        });
      }
    } catch {
      // Fallback
    }

    // Update in memory
    const idx = memorySubscriptions.findIndex(s => s.id === id);
    if (idx !== -1) {
      memorySubscriptions[idx] = { ...sub };
    }

    // Synchronize license status
    await this.syncLicenseWithSubscription(id);

    return { success: true, subscription: sub };
  }

  /**
   * Handles payment failure without instant revocation (Enters PAST_DUE grace period)
   */
  static async handleFailedPayment(id: string, reason?: string): Promise<{ success: boolean; subscription?: SubscriptionRecord }> {
    const sub = await this.getById(id);
    if (!sub) return { success: false };

    // Set to PAST_DUE (Grace period: no immediate revocation)
    sub.status = 'PAST_DUE';
    sub.updatedAt = new Date().toISOString();

    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        await prisma.subscription.update({
          where: { id },
          data: { status: 'PAST_DUE' as any }
        });
      }
    } catch {}

    const idx = memorySubscriptions.findIndex(s => s.id === id);
    if (idx !== -1) memorySubscriptions[idx] = { ...sub };

    return { success: true, subscription: sub };
  }

  static handlePaymentFailed = this.handleFailedPayment;

  /**
   * Handles successful payment, advances period, and ensures ACTIVE status
   */
  static async handleSuccessfulPayment(
    id: string,
    nextPeriodEnd?: Date
  ): Promise<{ success: boolean; subscription?: SubscriptionRecord }> {
    const sub = await this.getById(id);
    if (!sub) return { success: false };

    const now = new Date();
    const durationDays = sub.billingPeriod === 'yearly' ? 365 : 30;
    const end = nextPeriodEnd || new Date(now.getTime() + durationDays * 24 * 3600 * 1000);

    sub.status = 'ACTIVE';
    sub.currentPeriodStart = now.toISOString();
    sub.currentPeriodEnd = end.toISOString();
    sub.updatedAt = now.toISOString();

    try {
      if (process.env.DATABASE_URL && prisma?.subscription) {
        await prisma.subscription.update({
          where: { id },
          data: {
            status: 'ACTIVE' as any,
            currentPeriodStart: now,
            currentPeriodEnd: end
          }
        });
      }
    } catch {}

    const idx = memorySubscriptions.findIndex(s => s.id === id);
    if (idx !== -1) memorySubscriptions[idx] = { ...sub };

    // Keep license active & validTo synchronized
    await this.syncLicenseWithSubscription(id);

    return { success: true, subscription: sub };
  }

  static handlePaymentSucceeded = this.handleSuccessfulPayment;

  /**
   * Evaluates if a subscription is currently providing access
   * Active rules:
   * - ACTIVE: yes
   * - TRIALING: yes
   * - PAST_DUE: yes (during grace period)
   * - CANCELLED / EXPIRED: only if currentPeriodEnd > now (when cancelAtPeriodEnd was set)
   */
  static isSubscriptionEffective(subscription: SubscriptionRecord): boolean {
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);

    if (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING') {
      return true;
    }

    if (subscription.status === 'PAST_DUE') {
      // 7-day grace period from period end
      const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 3600 * 1000);
      return now <= graceEnd;
    }

    if (subscription.cancelAtPeriodEnd && now <= periodEnd) {
      return true;
    }

    return false;
  }

  /**
   * Synchronizes linked License with Subscription status
   */
  static async syncLicenseWithSubscription(subscriptionId: string): Promise<void> {
    const sub = await this.getById(subscriptionId);
    if (!sub) return;

    const tenantLicense = LicenseService.getByTenantId(sub.tenantId);
    if (!tenantLicense) return;

    const isEffective = this.isSubscriptionEffective(sub);

    if (isEffective) {
      tenantLicense.status = 'active';
      // Sync validity to subscription period end
      if (new Date(tenantLicense.validTo) < new Date(sub.currentPeriodEnd)) {
        tenantLicense.validTo = sub.currentPeriodEnd;
      }
    } else {
      if (sub.status === 'CANCELLED') {
        tenantLicense.status = 'expired';
      } else if (sub.status === 'EXPIRED') {
        tenantLicense.status = 'expired';
      }
    }
  }

  private static mapPrismaToSubscription(prismaSub: any): SubscriptionRecord {
    return {
      id: prismaSub.id,
      tenantId: prismaSub.tenantId,
      planId: prismaSub.planId,
      provider: prismaSub.provider,
      providerSubscriptionId: prismaSub.providerSubscriptionId || undefined,
      status: (prismaSub.status || 'ACTIVE') as SubscriptionStatusType,
      billingPeriod: prismaSub.billingPeriod || 'monthly',
      currentPeriodStart: prismaSub.currentPeriodStart ? new Date(prismaSub.currentPeriodStart).toISOString() : new Date().toISOString(),
      currentPeriodEnd: prismaSub.currentPeriodEnd ? new Date(prismaSub.currentPeriodEnd).toISOString() : new Date().toISOString(),
      cancelAtPeriodEnd: Boolean(prismaSub.cancelAtPeriodEnd),
      cancelledAt: prismaSub.cancelledAt ? new Date(prismaSub.cancelledAt).toISOString() : undefined,
      amount: Number(prismaSub.amount || 0),
      currency: prismaSub.currency || 'EUR',
      createdAt: prismaSub.createdAt ? new Date(prismaSub.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: prismaSub.updatedAt ? new Date(prismaSub.updatedAt).toISOString() : new Date().toISOString(),
      plan: prismaSub.plan ? {
        id: prismaSub.plan.id,
        applicationId: prismaSub.plan.applicationId,
        name: prismaSub.plan.name,
        slug: prismaSub.plan.slug,
        description: prismaSub.plan.description || '',
        priceMonthly: Number(prismaSub.plan.monthlyPrice || 0),
        priceYearly: Number(prismaSub.plan.yearlyPrice || 0),
        monthlyPrice: Number(prismaSub.plan.monthlyPrice || 0),
        yearlyPrice: Number(prismaSub.plan.yearlyPrice || 0),
        currency: prismaSub.plan.currency || 'EUR',
        status: prismaSub.plan.status || 'ACTIVE',
        features: prismaSub.plan.features || []
      } : undefined
    };
  }
}
