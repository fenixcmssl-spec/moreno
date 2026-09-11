import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const plans = await PlanService.getAll({ applicationId, status, search });
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/plans:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando planes desde PostgreSQL' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      applicationId = 'ECOMMERCE',
      monthlyPrice,
      yearlyPrice,
      priceMonthly,
      priceYearly,
      currency = 'EUR',
      trialDays = 14,
      description,
      status = 'ACTIVE',
      entitlements = {},
      features = [],
      badge,
      imageUrl,
      popular = false
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'El nombre del plan es obligatorio' }, { status: 400 });
    }

    const plan = await PlanService.create({
      name,
      slug,
      applicationId,
      monthlyPrice: Number(monthlyPrice ?? priceMonthly ?? 0),
      yearlyPrice: Number(yearlyPrice ?? priceYearly ?? (Number(monthlyPrice ?? priceMonthly ?? 0) * 10)),
      currency,
      trialDays: Number(trialDays),
      description: description || '',
      status,
      entitlements,
      features,
      badge,
      imageUrl,
      popular
    });

    AuditService.log({
      action: 'PLAN_CREATED_PG',
      entity: 'Plan',
      entityId: plan.id,
      details: { name: plan.name, slug: plan.slug, monthlyPrice: plan.monthlyPrice }
    });

    return NextResponse.json({ success: true, plan }, { status: 201 });
  } catch (error: any) {
    console.error('API Error in POST /api/admin/plans:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error creando plan en PostgreSQL' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID del plan requerido' }, { status: 400 });
    }

    const updated = await PlanService.update(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Plan no encontrado en PostgreSQL' }, { status: 404 });
    }

    AuditService.log({
      action: 'PLAN_UPDATED_PG',
      entity: 'Plan',
      entityId: id,
      details: { name: updated.name, monthlyPrice: updated.monthlyPrice }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('API Error in PUT /api/admin/plans:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error actualizando plan en PostgreSQL' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id y status son requeridos' }, { status: 400 });
    }

    const updated = await PlanService.setStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Plan no encontrado' }, { status: 404 });
    }

    AuditService.log({
      action: 'PLAN_STATUS_CHANGED_PG',
      entity: 'Plan',
      entityId: id,
      details: { status }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    console.error('API Error in PATCH /api/admin/plans:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cambiando estado del plan' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID del plan requerido para eliminar' }, { status: 400 });
    }

    const result = await PlanService.delete(id);

    AuditService.log({
      action: 'PLAN_DELETED_PG',
      entity: 'Plan',
      entityId: id,
      details: { deletedId: id }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error in DELETE /api/admin/plans:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Error al eliminar el plan' 
    }, { status: 400 });
  }
}
