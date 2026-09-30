import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/services/audit.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const action = searchParams.get('action');

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: requestedTenantId || undefined
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, isSuperAdmin } = auth.context;

    const targetTenantId = isSuperAdmin && requestedTenantId === 'all' ? undefined : (isSuperAdmin && requestedTenantId ? requestedTenantId : tenant.id);

    const logs = AuditService.getLogs({
      tenantId: targetTenantId,
      action: action || undefined
    });

    return NextResponse.json({ logs, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando registros de auditoría' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;
    const item = AuditService.log({
      ...body,
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email
    });

    return NextResponse.json({ success: true, log: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error guardando auditoría' }, { status: 500 });
  }
}
