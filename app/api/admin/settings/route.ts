import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const settings = await SuperAdminService.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/settings:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando configuración' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const body = await req.json();
    const updated = await SuperAdminService.updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('API Error in PUT /api/admin/settings:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error guardando configuración' }, { status: 500 });
  }
}
