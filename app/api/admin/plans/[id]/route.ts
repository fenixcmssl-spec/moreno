import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await PlanService.getById(id);

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan no encontrado en PostgreSQL' }, { status: 404 });
    }

    const check = await PlanService.canDelete(id);

    return NextResponse.json({ 
      success: true, 
      plan,
      canDelete: check.canDelete,
      activeLicensesCount: check.activeLicensesCount,
      deleteRestrictionReason: check.reason
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error obteniendo plan' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await PlanService.update(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Plan no encontrado' }, { status: 404 });
    }

    AuditService.log({
      action: 'PLAN_UPDATED_PG',
      entity: 'Plan',
      entityId: id,
      details: { name: updated.name, monthlyPrice: updated.monthlyPrice }
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error actualizando plan' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: 'status es requerido' }, { status: 400 });
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
    return NextResponse.json({ success: false, error: error?.message || 'Error cambiando estado' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await PlanService.delete(id);

    AuditService.log({
      action: 'PLAN_DELETED_PG',
      entity: 'Plan',
      entityId: id,
      details: { id }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Error eliminando plan' 
    }, { status: 400 });
  }
}
