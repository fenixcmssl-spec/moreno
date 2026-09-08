import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { AuditService } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, tenantId, domain, environment } = body;

    if (!licenseKey || !tenantId || !domain) {
      return NextResponse.json(
        { success: false, error: 'licenseKey, tenantId y domain son campos obligatorios' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = LicenseService.activate({
      licenseKey,
      tenantId,
      domain,
      environment,
      ipAddress: ip
    });

    if (result.success) {
      AuditService.log({
        tenantId,
        action: 'LICENSE_ACTIVATED',
        entity: 'LicenseActivation',
        entityId: result.activation?.id,
        details: { domain, environment, licenseKey: licenseKey.substring(0, 12) + '...' }
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error activando licencia' },
      { status: 500 }
    );
  }
}
