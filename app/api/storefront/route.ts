import { NextRequest, NextResponse } from 'next/server';
import { StorefrontService } from '@/lib/services/storefront.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryHost = searchParams.get('host');
    const querySlug = searchParams.get('slug') || searchParams.get('store') || searchParams.get('tenant');
    const forceFresh = searchParams.get('fresh') === 'true';

    const headerHost = req.headers.get('x-resolved-hostname') || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const headerSlug = req.headers.get('x-tenant-slug') || '';

    const effectiveHost = queryHost || headerHost;
    const effectiveSlug = querySlug || headerSlug;

    const payload = await StorefrontService.resolveStorefront(effectiveHost, {
      fallbackSlug: effectiveSlug || undefined,
      forceFresh
    });

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Comercio no encontrado', code: 'STOREFRONT_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error resolviendo tienda' },
      { status: 500 }
    );
  }
}
