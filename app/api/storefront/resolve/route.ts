import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_TENANTS, INITIAL_PRODUCTS } from '@/lib/initialData';
import { LicenseService } from '@/lib/services/license.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const host = searchParams.get('host');
    const slug = searchParams.get('slug');

    let tenant = null;

    if (slug) {
      tenant = INITIAL_TENANTS.find(t => t.slug.toLowerCase() === slug.toLowerCase());
    } else if (host) {
      const cleanHost = host.toLowerCase().split(':')[0];
      // Check subdomain or custom domain
      tenant = INITIAL_TENANTS.find(
        t => t.domain?.toLowerCase() === cleanHost || t.customDomain?.toLowerCase() === cleanHost
      );
      // If host is localhost or preview, fallback to first tenant or slug
      if (!tenant && (cleanHost.includes('localhost') || cleanHost.includes('run.app') || cleanHost.includes('web.app'))) {
        tenant = INITIAL_TENANTS[0];
      }
    } else {
      tenant = INITIAL_TENANTS[0];
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // License Check
    const license = LicenseService.getByTenantId(tenant.id);
    const validation = license ? LicenseService.validate({ licenseKey: license.licenseKey }) : null;

    const products = INITIAL_PRODUCTS.filter(p => p.tenantId === tenant.id || !p.tenantId);

    return NextResponse.json({
      tenant,
      licenseStatus: validation?.status || 'ACTIVE',
      isValidLicense: validation?.valid ?? true,
      entitlements: validation?.entitlements || {},
      products
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error resolviendo tienda' }, { status: 500 });
  }
}
