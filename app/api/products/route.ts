import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { ProductService } from '@/lib/services/product.service';
import { AuditService } from '@/lib/services/audit.service';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const requestedTenantId = searchParams.get('tenantId');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let effectiveTenantId: string;

    if (session) {
      // Authenticated call - enforce tenant boundaries
      if (session.role === 'SUPER_ADMIN') {
        effectiveTenantId = requestedTenantId || session.tenantId || 'tenant_demo';
      } else {
        if (requestedTenantId && requestedTenantId !== session.tenantId && requestedTenantId !== session.tenantSlug) {
          return NextResponse.json(
            { error: 'Acceso denegado a los productos de otro comercio', code: 'TENANT_FORBIDDEN' },
            { status: 403 }
          );
        }
        effectiveTenantId = session.tenantId || requestedTenantId || 'tenant_demo';
      }
    } else {
      // Public Storefront query - derive strictly from domain / slug
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      effectiveTenantId = publicContext?.tenant?.id || requestedTenantId || 'tenant_demo';
    }

    const { products, total } = await ProductService.listProducts(effectiveTenantId, {
      category,
      search,
      limit,
      offset
    });

    return NextResponse.json({
      products,
      total,
      tenantId: effectiveTenantId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando productos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      price,
      comparePrice,
      costPrice,
      stock = 10,
      sku,
      category = 'General',
      categoryId,
      images,
      featured = false,
      isBestSeller = false,
      isDeal = false,
      tags = [],
      attributes,
      variants,
      translations,
      status = 'active'
    } = body;

    // Strict Tenant Role & Context Verification
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    if (!title || price === undefined) {
      return NextResponse.json(
        { error: 'Título y precio son campos requeridos' },
        { status: 400 }
      );
    }

    // Entitlement limit check for products.max
    const currentCount = await (prisma as any).product.count({
      where: { tenantId: tenant.id }
    });

    const entitlementCheck = await TenantContextHelper.requireEntitlement(req, 'products.max', {
      targetTenantId: tenant.id,
      currentCount,
      increment: 1
    });

    if (!entitlementCheck.success) {
      return entitlementCheck.response;
    }

    const product = await ProductService.createProduct(tenant.id, {
      title,
      slug,
      description,
      price: Number(price),
      comparePrice: comparePrice !== undefined ? Number(comparePrice) : undefined,
      costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
      stock: Number(stock),
      sku,
      category,
      categoryId,
      images,
      featured: Boolean(featured),
      isBestSeller: Boolean(isBestSeller),
      isDeal: Boolean(isDeal),
      tags,
      attributes,
      variants,
      translations,
      status
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: product.id,
      details: { title, price: product.price, sku: product.sku }
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando producto' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    const updated = await ProductService.updateProduct(tenant.id, id, updates);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando producto' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN');
    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    await ProductService.deleteProduct(tenant.id, id);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: id
    });

    return NextResponse.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando producto' }, { status: 500 });
  }
}
