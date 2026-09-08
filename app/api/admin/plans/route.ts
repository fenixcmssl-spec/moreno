import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');

    if (applicationId) {
      const plans = PlanService.getByApplication(applicationId);
      return NextResponse.json({ plans });
    }

    const plans = PlanService.getAll();
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando planes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      applicationId = 'ECOMMERCE',
      priceMonthly = 29,
      priceYearly = 290,
      description,
      entitlements = {},
      features = [],
      badge
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nombre y slug del plan requeridos' }, { status: 400 });
    }

    const plan = PlanService.create({
      name,
      slug: slug.toLowerCase(),
      applicationId,
      priceMonthly: Number(priceMonthly),
      priceYearly: Number(priceYearly),
      description: description || '',
      entitlements,
      features,
      badge,
      status: 'ACTIVE'
    });

    AuditService.log({
      action: 'PLAN_CREATED',
      entity: 'Plan',
      entityId: plan.id,
      details: { name, slug: plan.slug, priceMonthly }
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando plan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'id y updates requeridos' }, { status: 400 });
    }

    const updated = PlanService.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    AuditService.log({
      action: 'PLAN_UPDATED',
      entity: 'Plan',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando plan' }, { status: 500 });
  }
}
