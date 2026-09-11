import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const payments = await SuperAdminService.getPayments();
    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/payments:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando pagos desde PostgreSQL' }, { status: 500 });
  }
}
