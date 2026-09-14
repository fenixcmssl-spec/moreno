import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { PageService } from '@/lib/services/page.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const search = searchParams.get('search') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : undefined;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;
    let isStaffOrAdmin = false;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      targetTenantId = auth.context.tenant.id;
      isStaffOrAdmin = true;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }
      targetTenantId = publicContext.tenant.id;
    }

    if (id) {
      const page = await PageService.getPageById(targetTenantId, id);
      if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
      if (!isStaffOrAdmin && page.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
      }
      return NextResponse.json({ page, tenantId: targetTenantId });
    }

    if (slug) {
      const page = await PageService.getPageBySlug(targetTenantId, slug, { allowDraft: isStaffOrAdmin });
      if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 });
      return NextResponse.json({ page, tenantId: targetTenantId });
    }

    const { pages, total } = await PageService.getPages(targetTenantId, {
      search,
      skip,
      take,
      allowDraft: isStaffOrAdmin
    });

    return NextResponse.json({ pages, total, tenantId: targetTenantId });
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

    const page = await PageService.createPage(
      tenant.id,
      {
        title: body.title,
        slug: body.slug,
        content: body.content || '',
        status: body.status || 'PUBLISHED',
        seoTitle: body.seoTitle,
        seoDesc: body.seoDesc || body.seoDescription
      },
      {
        id: session?.userId,
        email: session?.email
      }
    );

    return NextResponse.json({ success: true, page }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'SLUG_CONFLICT' || error?.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Error creando página' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    const body = await req.json();
    const id = body.id || new URL(req.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de página requerido' }, { status: 400 });
    }

    const updated = await PageService.updatePage(
      tenant.id,
      id,
      {
        title: body.title,
        slug: body.slug,
        content: body.content,
        status: body.status,
        seoTitle: body.seoTitle,
        seoDesc: body.seoDesc || body.seoDescription
      },
      {
        id: session?.userId,
        email: session?.email
      }
    );

    return NextResponse.json({ success: true, page: updated });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error?.code === 'SLUG_CONFLICT' || error?.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Error actualizando página' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    await PageService.deletePage(tenant.id, id, {
      id: session?.userId,
      email: session?.email
    });

    return NextResponse.json({ success: true, message: 'Página eliminada' });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Error eliminando página' }, { status: 500 });
  }
}
