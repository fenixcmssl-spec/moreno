import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, domain, tenantId, applicationId } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, status: 'INVALID', error: 'Clave de licencia requerida' },
        { status: 400 }
      );
    }

    const result = LicenseService.validate({
      licenseKey,
      domain,
      tenantId,
      applicationId
    });

    return NextResponse.json(result, { status: result.valid ? 200 : 403 });
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, status: 'INVALID', error: error?.message || 'Error validando licencia' },
      { status: 500 }
    );
  }
}
