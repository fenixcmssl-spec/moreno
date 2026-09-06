import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage/storage.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || 'tenant_1';
  const files = StorageService.getTenantMedia(tenantId);
  return NextResponse.json({ success: true, files });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, filename, mimeType, size, url, alt } = body;

    if (!tenantId || !filename || !mimeType) {
      return NextResponse.json({ success: false, error: 'Parámetros incompletos' }, { status: 400 });
    }

    const result = await StorageService.uploadFile({
      tenantId,
      filename,
      mimeType,
      size: size || 120000,
      url,
      alt
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
