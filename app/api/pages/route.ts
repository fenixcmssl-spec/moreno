import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { CustomPage } from '@/types';

let pagesDb: CustomPage[] = [
  {
    id: 'page_about',
    tenantId: 'tenant_1',
    title: 'Sobre Nosotros',
    slug: 'sobre-nosotros',
    content: 'Somos una empresa comprometida con la máxima calidad y satisfacción de nuestros clientes.',
    status: 'published',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'page_contact',
    tenantId: 'tenant_1',
    title: 'Contacto & Soporte',
    slug: 'contacto',
    content: '¿Tienes alguna duda? Escríbenos a soporte@fenixcms.es y te responderemos en menos de 24 horas.',
    status: 'published',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      targetTenantId = auth.context.tenant.id;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      targetTenantId = publicContext.tenant?.id || 'tenant_1';
    }

    if (slug) {
      const page = pagesDb.find(p => p.tenantId === targetTenantId && p.slug === slug);
      if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
      return NextResponse.json({ page, tenantId: targetTenantId });
    }

    const pages = pagesDb.filter(p => p.tenantId === targetTenantId);
    return NextResponse.json({ pages, total: pages.length, tenantId: targetTenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando páginas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Título de página requerido' }, { status: 400 });
    }

    const newPage: CustomPage = {
      id: `page_${Date.now()}`,
      tenantId: tenant.id,
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content: body.content || '',
      status: body.status || 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    pagesDb.unshift(newPage);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PAGE_CREATED',
      entity: 'Page',
      entityId: newPage.id,
      details: { title: body.title, slug: newPage.slug }
    });

    return NextResponse.json({ success: true, page: newPage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando página' }, { status: 500 });
  }
}
