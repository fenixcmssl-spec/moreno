import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const tenants = await SuperAdminService.getTenants();
    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/tenants:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando tenants desde PostgreSQL' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const { tenantId, status } = body;
    if (!tenantId || !status) {
      return NextResponse.json({ success: false, error: 'tenantId y status requeridos' }, { status: 400 });
    }

    const success = await SuperAdminService.updateTenantStatus(tenantId, status);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('API Error in PATCH /api/admin/tenants:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error actualizando tenant' }, { status: 500 });
  }
}
