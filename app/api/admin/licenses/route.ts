import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { LicenseService } from '@/lib/services/license.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    const licenses = await SuperAdminService.getLicenses({ status, tenantId });
    return NextResponse.json({ success: true, licenses });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/licenses:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando licencias desde PostgreSQL' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const created = await LicenseService.createLicense(body);

    return NextResponse.json({ success: true, license: created }, { status: 201 });
  } catch (error: any) {
    console.error('API Error in POST /api/admin/licenses:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error creando licencia' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id y status son requeridos' }, { status: 400 });
    }

    const updated = LicenseService.updateStatus(id, status);
    return NextResponse.json({ success: true, license: updated });
  } catch (error: any) {
    console.error('API Error in PATCH /api/admin/licenses:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error actualizando licencia' }, { status: 500 });
  }
}
