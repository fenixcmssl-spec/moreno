import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_TENANTS } from '@/lib/initialData';
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
      const cleanHost = domain.toLowerCase();
      const tenant = tenantsDb.find(
        t => t.domain?.toLowerCase() === cleanHost || t.customDomain?.toLowerCase() === cleanHost
      );
      if (!tenant) {
        return NextResponse.json({ error: 'Dominio no asignado a ningún comercio' }, { status: 404 });
      }
      return NextResponse.json({ tenant });
    }

    return NextResponse.json({ tenants: tenantsDb });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error consultando comercios' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, branding, settings, status, themeId, activePlugins, customDomain } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const idx = tenantsDb.findIndex(t => t.id === tenantId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    const current = tenantsDb[idx];
    tenantsDb[idx] = {
      ...current,
      ...(branding ? { branding: { ...current.branding, ...branding } } : {}),
      ...(settings ? { settings: { ...current.settings, ...settings } } : {}),
      ...(status ? { status } : {}),
      ...(themeId ? { themeId } : {}),
      ...(activePlugins ? { activePlugins } : {}),
      ...(customDomain !== undefined ? { customDomain } : {})
    };

    AuditService.log({
      tenantId,
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenantId,
      details: { updatedFields: Object.keys(body) }
    });

    return NextResponse.json({ success: true, tenant: tenantsDb[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando comercio' }, { status: 500 });
  }
}
