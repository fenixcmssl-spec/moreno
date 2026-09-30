import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const activations = await SuperAdminService.getActivations();
    return NextResponse.json({ success: true, activations });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/activations:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando activaciones desde PostgreSQL' }, { status: 500 });
  }
}
