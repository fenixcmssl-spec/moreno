import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionItem } from '@/types';
import { AuditService } from '@/lib/services/audit.service';

let subscriptionsDb: SubscriptionItem[] = [
  {
    id: 'sub_1',
    tenantId: 'tenant_1',
    applicationId: 'ECOMMERCE',
    planId: 'plan_pro',
    provider: 'paypal',
    providerSubscriptionId: 'I-BW4529668470',
    status: 'ACTIVE',
    billingPeriod: 'monthly',
    currentPeriodStart: '2026-01-01T00:00:00Z',
    currentPeriodEnd: '2026-12-31T23:59:59Z'
  },
  {
    id: 'sub_2',
    tenantId: 'tenant_2',
    applicationId: 'ECOMMERCE',
    planId: 'plan_enterprise',
    provider: 'stripe',
    providerSubscriptionId: 'sub_1N80J2LkdIwHu7ix',
    status: 'ACTIVE',
    billingPeriod: 'yearly',
    currentPeriodStart: '2026-01-01T00:00:00Z',
    currentPeriodEnd: '2026-12-31T23:59:59Z'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (tenantId) {
      const sub = subscriptionsDb.find(s => s.tenantId === tenantId);
      return NextResponse.json({ subscription: sub || null });
    }

    return NextResponse.json({ subscriptions: subscriptionsDb });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando suscripciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, planId, applicationId = 'ECOMMERCE', provider = 'paypal', billingPeriod = 'monthly' } = body;

    if (!tenantId || !planId) {
      return NextResponse.json({ error: 'tenantId y planId requeridos' }, { status: 400 });
    }

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

    const newSub: SubscriptionItem = {
      id: `sub_${Date.now()}`,
      tenantId,
      applicationId,
      planId,
      provider,
      providerSubscriptionId: `${provider}_sub_${Date.now()}`,
      status: 'ACTIVE',
      billingPeriod,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString()
    };

    subscriptionsDb.unshift(newSub);

    AuditService.log({
      tenantId,
      action: 'SUBSCRIPTION_CREATED',
      entity: 'Subscription',
      entityId: newSub.id,
      details: { planId, billingPeriod, provider }
    });

    return NextResponse.json({ success: true, subscription: newSub }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando suscripción' }, { status: 500 });
  }
}
