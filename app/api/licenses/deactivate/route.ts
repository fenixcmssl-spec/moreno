import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { AuditService } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, domain } = body;

    if (!licenseKey || !domain) {
      return NextResponse.json(
        { success: false, error: 'licenseKey y domain son obligatorios' },
        { status: 400 }
      );
    }

    const result = LicenseService.deactivate({ licenseKey, domain });
    if (result.success) {
      AuditService.log({
        action: 'LICENSE_DEACTIVATED',
        entity: 'LicenseActivation',
        details: { domain, licenseKey: licenseKey.substring(0, 12) + '...' }
      });
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error desactivando licencia' },
      { status: 500 }
    );
  }
}
