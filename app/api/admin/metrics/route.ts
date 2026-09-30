import { NextRequest, NextResponse } from 'next/server';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { requireSuperAdmin, adminUnauthorizedResponse } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify SUPER_ADMIN role strictly
    const authResult = await requireSuperAdmin(req);
    if (!authResult.authorized) {
      return adminUnauthorizedResponse(authResult);
    }

    // 2. Fetch calculated metrics directly from PostgreSQL
    const metrics = await SuperAdminService.getDashboardMetrics();

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/metrics:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error calculando métricas desde PostgreSQL' },
      { status: 500 }
    );
  }
}
