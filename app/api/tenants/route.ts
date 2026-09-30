import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { TenantService } from '@/lib/services/tenant.service';
import { AuditService } from '@/lib/services/audit.service';
import { requireSuperAdmin } from '@/lib/auth/admin-guard';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const domain = searchParams.get('domain');

    if (slug) {
      const tenant = await TenantService.getBySlug(slug);
      if (!tenant) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ tenant });
    }

    if (domain) {
      const tenant = await TenantService.getByDomain(domain);
      if (!tenant) {
        return NextResponse.json({ error: 'Dominio no asignado a ningún comercio' }, { status: 404 });
      }
      return NextResponse.json({ tenant });
    }

    // Listing all tenants requires Super Admin authentication
    const superAdminAuth = await requireSuperAdmin(req);
    if (!superAdminAuth.authorized) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren privilegios de SUPER_ADMIN para listar comercios', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const tenants = await TenantService.listTenants();
    return NextResponse.json({ tenants });
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

    const updatedTenant = await TenantService.updateTenant(tenant.id, {
      ...(branding ? { branding: { ...tenant.branding, ...branding } } : {}),
      ...(settings ? { settings: { ...tenant.settings, ...settings } } : {}),
      ...(status && isSuperAdmin ? { status } : {}), // Only super admin can alter active/suspended status
      ...(themeId ? { themeId } : {}),
      ...(activePlugins ? { activePlugins } : {}),
      ...(customDomain !== undefined ? { customDomain } : {})
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenant.id,
      details: { updatedFields: Object.keys(body) }
    });

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando comercio' }, { status: 500 });
  }
}
