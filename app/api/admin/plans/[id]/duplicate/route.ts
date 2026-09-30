import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';
import { AuditService } from '@/lib/services/audit.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.authorized) {
      return adminUnauthorizedResponse(authResult);
    }

    const { id } = await params;
    const duplicated = await PlanService.duplicate(id);

    if (!duplicated) {
      return NextResponse.json({ success: false, error: 'Plan no encontrado para duplicar' }, { status: 404 });
    }

    AuditService.log({
      action: 'PLAN_DUPLICATED_PG',
      entity: 'Plan',
      entityId: duplicated.id,
      userEmail: authResult.session?.email,
      details: { originalId: id, newPlanName: duplicated.name, newSlug: duplicated.slug }
    });

    return NextResponse.json({ success: true, plan: duplicated }, { status: 201 });
  } catch (error: any) {
    console.error('API Error in duplicate plan:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error duplicando plan en PostgreSQL' }, { status: 400 });
  }
}
