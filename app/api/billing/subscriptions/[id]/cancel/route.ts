import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { SubscriptionService } from '@/lib/services/subscription.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { cancelAtPeriodEnd = true, reason } = body;

    const sub = await SubscriptionService.getById(id);
    if (!sub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: sub.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    const result = await SubscriptionService.cancelSubscription(id, {
      cancelAtPeriodEnd,
      reason
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'SUBSCRIPTION_CANCELLED',
      entity: 'Subscription',
      entityId: id,
      details: { cancelAtPeriodEnd, reason }
    });

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      message: cancelAtPeriodEnd
        ? 'La suscripción permanecerá activa hasta el fin del ciclo de facturación'
        : 'La suscripción ha sido cancelada de forma inmediata'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cancelando suscripción' }, { status: 500 });
  }
}
