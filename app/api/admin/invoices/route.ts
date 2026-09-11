import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const invoices = await SuperAdminService.getInvoices();
    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/invoices:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando facturas desde PostgreSQL' }, { status: 500 });
  }
}
