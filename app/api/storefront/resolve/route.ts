import { NextRequest, NextResponse } from 'next/server';
import { StorefrontService } from '@/lib/services/storefront.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryHost = searchParams.get('host');
    const querySlug = searchParams.get('slug') || searchParams.get('store') || searchParams.get('tenant');
    const forceFresh = searchParams.get('fresh') === 'true';

    // Extract headers set by middleware
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
        {
          success: false,
          error: 'Comercio o dominio no encontrado en FenixCMS',
          code: 'STOREFRONT_NOT_FOUND',
          requestedHost: effectiveHost
        },
        { status: 404 }
      );
    }

    if (payload.tenant.status === 'suspended') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta tienda se encuentra temporalmente suspendida por mantenimiento o revisión administrativa.',
          code: 'TENANT_SUSPENDED',
          tenant: {
            id: payload.tenant.id,
            name: payload.tenant.name,
            slug: payload.tenant.slug,
            status: payload.tenant.status
          }
        },
        { status: 403 }
      );
    }

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-Tenant-Id': payload.tenant.id,
        'X-Tenant-Slug': payload.tenant.slug
      }
    });
  } catch (error: any) {
    console.error('Error en /api/storefront/resolve:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error interno resolviendo el escaparate',
        code: 'STOREFRONT_INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
