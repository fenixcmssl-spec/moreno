import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { SubscriptionService } from '@/lib/services/subscription.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: requestedTenantId || undefined
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, isSuperAdmin } = auth.context;

    if (isSuperAdmin && searchParams.get('all') === 'true') {
      const allSubs = await SubscriptionService.getAll();
      return NextResponse.json({ subscriptions: allSubs });
    }

    const sub = await SubscriptionService.getByTenantId(tenant.id);
    return NextResponse.json({ subscription: sub || null, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando suscripciones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, provider = 'stripe', billingPeriod = 'monthly', amount, currency = 'EUR', trialDays } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    if (!planId) {
      return NextResponse.json({ error: 'planId es requerido' }, { status: 400 });
    }

    const newSub = await SubscriptionService.createSubscription({
      tenantId: tenant.id,
      planId,
      provider,
      billingPeriod,
      amount,
      currency,
      trialDays
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
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
