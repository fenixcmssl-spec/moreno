import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const action = searchParams.get('action');

    const logs = AuditService.getLogs({
      tenantId: tenantId || undefined,
      action: action || undefined
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando registros de auditoría' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = AuditService.log(body);
    return NextResponse.json({ success: true, log: item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error guardando auditoría' }, { status: 500 });
  }
}
