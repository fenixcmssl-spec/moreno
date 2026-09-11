import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { DomainService } from '@/lib/services/domain.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hostname = searchParams.get('hostname');

    // Public domain check for DNS routing
    if (hostname) {
      const resolution = await DomainService.resolveHostname(hostname);
      return NextResponse.json({
        domain: resolution.domain || null,
        tenant: resolution.tenant || null,
        found: resolution.found,
        resolutionType: resolution.resolutionType
      });
    }

    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;
    const tenantDomains = await DomainService.getDomainsByTenant(tenant.id);
    return NextResponse.json({ domains: tenantDomains, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando dominios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hostname, type = 'custom', primary = false } = body;

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    if (!hostname) {
      return NextResponse.json({ error: 'hostname es requerido' }, { status: 400 });
    }

    // Entitlement Check: customDomain.enabled for custom domains
    if (type === 'custom') {
      const customDomainCheck = await TenantContextHelper.requireEntitlement(auth.context, 'customDomain.enabled');
      if (!customDomainCheck.success) {
        return customDomainCheck.response;
      }
    }

    // Entitlement Check: domains.max
    const domainsLimitCheck = await TenantContextHelper.requireEntitlement(auth.context, 'domains.max', {
      increment: 1
    });
    if (!domainsLimitCheck.success) {
      return domainsLimitCheck.response;
    }

    const result = await DomainService.createDomain({
      tenantId: tenant.id,
      hostname,
      type,
      primary
    });

    if (!result.success || !result.domain) {
      return NextResponse.json({ error: result.error || 'Error al registrar dominio' }, { status: 400 });
    }

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'DOMAIN_ADDED',
      entity: 'Domain',
      entityId: result.domain.id,
      details: { hostname: result.domain.hostname, type }
    });

    return NextResponse.json({ success: true, domain: result.domain }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error añadiendo dominio' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get('id');

    if (!domainId) {
      return NextResponse.json({ error: 'id de dominio requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    const deleteRes = await DomainService.deleteDomain(domainId, tenant.id);
    if (!deleteRes.success) {
      return NextResponse.json({ error: deleteRes.error || 'Error al eliminar dominio' }, { status: 400 });
    }

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'DOMAIN_DELETED',
      entity: 'Domain',
      entityId: domainId
    });

    return NextResponse.json({ success: true, message: 'Dominio eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando dominio' }, { status: 500 });
  }
}
