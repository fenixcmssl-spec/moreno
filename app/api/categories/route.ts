import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { CategoryService } from '@/lib/services/category.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const search = searchParams.get('search') || undefined;
    const parentId = searchParams.get('parentId') || undefined;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let effectiveTenantId: string;

    if (session) {
      if (session.role === 'SUPER_ADMIN') {
        effectiveTenantId = requestedTenantId || session.tenantId || 'tenant_demo';
      } else {
        if (requestedTenantId && requestedTenantId !== session.tenantId && requestedTenantId !== session.tenantSlug) {
          return NextResponse.json(
            { error: 'Acceso denegado a las categorías de otro comercio', code: 'TENANT_FORBIDDEN' },
            { status: 403 }
          );
        }
        effectiveTenantId = session.tenantId || requestedTenantId || 'tenant_demo';
      }
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      effectiveTenantId = publicContext?.tenant?.id || requestedTenantId || 'tenant_demo';
    }

    const { categories, total } = await CategoryService.listCategories(effectiveTenantId, {
      search,
      parentId,
      includeCounts: true
    });

    return NextResponse.json({
      categories,
      total,
      tenantId: effectiveTenantId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando categorías' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    if (!body.name) {
      return NextResponse.json({ error: 'El nombre de la categoría es requerido' }, { status: 400 });
    }

    const category = await CategoryService.createCategory(tenant.id, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      image: body.image,
      parentId: body.parentId,
      status: body.status || 'ACTIVE'
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
      details: { name: category.name, slug: category.slug }
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando categoría' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    const updated = await CategoryService.updateCategory(tenant.id, id, updates);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando categoría' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de categoría requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    await CategoryService.deleteCategory(tenant.id, id);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: id
    });

    return NextResponse.json({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando categoría' }, { status: 500 });
  }
}
