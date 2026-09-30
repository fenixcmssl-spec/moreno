import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const subscriptions = await SuperAdminService.getSubscriptions();
    return NextResponse.json({ success: true, subscriptions });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/subscriptions:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando suscripciones desde PostgreSQL' }, { status: 500 });
  }
}
