import { NextRequest, NextResponse } from 'next/server';
import { DomainItem } from '@/types';
import { AuditService } from '@/lib/services/audit.service';

let domainsDb: DomainItem[] = [
  {
    id: 'dom_1',
    tenantId: 'tenant_1',
    hostname: 'mitienda.fenixcms.es',
    type: 'subdomain',
    verified: true,
    primary: true,
    sslStatus: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'dom_2',
    tenantId: 'tenant_2',
    hostname: 'techtrends.com',
    type: 'custom',
    verified: true,
    primary: true,
    sslStatus: 'active',
    createdAt: '2026-01-02T00:00:00Z'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const hostname = searchParams.get('hostname');

    if (hostname) {
      const clean = hostname.toLowerCase();
      const domain = domainsDb.find(d => d.hostname.toLowerCase() === clean);
      return NextResponse.json({ domain: domain || null, found: Boolean(domain) });
    }

    if (tenantId) {
      const tenantDomains = domainsDb.filter(d => d.tenantId === tenantId);
      return NextResponse.json({ domains: tenantDomains });
    }

    return NextResponse.json({ domains: domainsDb });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando dominios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, hostname, type = 'custom', primary = false } = body;

    if (!tenantId || !hostname) {
      return NextResponse.json({ error: 'tenantId y hostname requeridos' }, { status: 400 });
    }

    const cleanHost = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    // Check if domain is already taken
    const existing = domainsDb.find(d => d.hostname.toLowerCase() === cleanHost);
    if (existing) {
      return NextResponse.json({ error: 'Este dominio ya está registrado en la plataforma' }, { status: 409 });
    }

    const newDomain: DomainItem = {
      id: `dom_${Date.now()}`,
      tenantId,
      hostname: cleanHost,
      type,
      verified: type === 'subdomain', // Subdomains are instant verified
      primary,
      sslStatus: 'active',
      createdAt: new Date().toISOString()
    };

    domainsDb.push(newDomain);

    AuditService.log({
      tenantId,
      action: 'DOMAIN_ADDED',
      entity: 'Domain',
      entityId: newDomain.id,
      details: { hostname: cleanHost, type }
    });

    return NextResponse.json({ success: true, domain: newDomain }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error añadiendo dominio' }, { status: 500 });
  }
}
