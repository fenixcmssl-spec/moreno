import { NextRequest, NextResponse } from 'next/server';
import { StorefrontService } from '@/lib/services/storefront.service';
import { isProductionMode } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryHost = searchParams.get('host');
    const querySlug = searchParams.get('slug') || searchParams.get('store') || searchParams.get('tenant');
    const forceFresh = searchParams.get('fresh') === 'true';

    // In production, NEVER allow query parameters to override the tenant / host (Zero Tenant Spoofing)
    const isProd = isProductionMode();
    const headerHost = req.headers.get('x-resolved-hostname') || req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const headerSlug = req.headers.get('x-tenant-slug') || '';

    let effectiveHost: string;
    let effectiveSlug: string | undefined;

    if (isProd) {
      effectiveHost = headerHost;
      effectiveSlug = headerSlug || undefined;
      // If query params are provided in production that contradict the host, reject spoofing
      if (querySlug && headerSlug && querySlug !== headerSlug) {
        return NextResponse.json(
          {
            success: false,
            error: 'Intento de resolución de tenant no autorizado para este host',
            code: 'TENANT_SPOOFING_REJECTED'
          },
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

