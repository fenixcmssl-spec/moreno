import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_TENANTS } from '@/lib/initialData';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { TenantStore } from '@/types';

let tenantsDb: TenantStore[] = [...INITIAL_TENANTS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const domain = searchParams.get('domain');

    if (slug) {
      const tenant = tenantsDb.find(t => t.slug.toLowerCase() === slug.toLowerCase());
      if (!tenant) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ tenant });
    }

    if (domain) {
      const cleanHost = domain.toLowerCase().split(':')[0];
      const tenant = tenantsDb.find(
        t => t.domain?.toLowerCase() === cleanHost || t.customDomain?.toLowerCase() === cleanHost
      );
      if (!tenant) {
        return NextResponse.json({ error: 'Dominio no asignado a ningún comercio' }, { status: 404 });
      }
      return NextResponse.json({ tenant });
    }

    // Listing all tenants requires Super Admin authentication
    const auth = await TenantContextHelper.requireTenantRole(req, 'SUPER_ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    return NextResponse.json({ tenants: tenantsDb });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error consultando comercios' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { branding, settings, status, themeId, activePlugins, customDomain } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session, isSuperAdmin } = auth.context;

    const idx = tenantsDb.findIndex(t => t.id === tenant.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const current = tenantsDb[idx];
    tenantsDb[idx] = {
      ...current,
      ...(branding ? { branding: { ...current.branding, ...branding } } : {}),
      ...(settings ? { settings: { ...current.settings, ...settings } } : {}),
      ...(status && isSuperAdmin ? { status } : {}), // Only super admin can alter active/suspended status
      ...(themeId ? { themeId } : {}),
      ...(activePlugins ? { activePlugins } : {}),
      ...(customDomain !== undefined ? { customDomain } : {})
    };

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenant.id,
      details: { updatedFields: Object.keys(body) }
    });

    return NextResponse.json({ success: true, tenant: tenantsDb[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando comercio' }, { status: 500 });
  }
}
