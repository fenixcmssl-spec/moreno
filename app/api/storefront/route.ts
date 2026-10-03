import { NextRequest, NextResponse } from 'next/server';
import { StorefrontService } from '@/lib/services/storefront.service';
import { isProductionMode } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryHost = searchParams.get('host');
    const querySlug = searchParams.get('slug') || searchParams.get('store') || searchParams.get('tenant');
    const forceFresh = searchParams.get('fresh') === 'true';

    const isProd = isProductionMode();
    const headerHost = req.headers.get('x-resolved-hostname') || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const headerSlug = req.headers.get('x-tenant-slug') || '';

    let effectiveHost: string;
    let effectiveSlug: string | undefined;

    if (isProd) {
      effectiveHost = headerHost;
      effectiveSlug = headerSlug || undefined;
      if (querySlug && headerSlug && querySlug !== headerSlug) {
        return NextResponse.json(
          { success: false, error: 'Acceso no autorizado', code: 'TENANT_SPOOFING_REJECTED' },
          { status: 403 }
        );
      }
    } else {
      effectiveHost = queryHost || headerHost;
      effectiveSlug = querySlug || headerSlug || undefined;
    }

    const payload = await StorefrontService.resolveStorefront(effectiveHost, {
      fallbackSlug: effectiveSlug,
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

