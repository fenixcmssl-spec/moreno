import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.authorized) {
      return adminUnauthorizedResponse(auth);
    }

    const plugins = await SuperAdminService.getPlugins();
    return NextResponse.json({ success: true, plugins });
  } catch (error: any) {
    console.error('API Error in GET /api/admin/plugins:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Error cargando plugins desde PostgreSQL' }, { status: 500 });
  }
}
