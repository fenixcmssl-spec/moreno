import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PRODUCTS } from '@/lib/initialData';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { Product } from '@/types';
import prisma from '@/lib/prisma';

let productsDb: Product[] = [...INITIAL_PRODUCTS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const requestedTenantId = searchParams.get('tenantId');

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let effectiveTenantId: string;

    if (session) {
      // Authenticated call - enforce tenant boundaries
      if (session.role === 'SUPER_ADMIN') {
        effectiveTenantId = requestedTenantId || session.tenantId || 'tenant_1';
      } else {
        if (requestedTenantId && requestedTenantId !== session.tenantId && requestedTenantId !== session.tenantSlug) {
          return NextResponse.json(
            { error: 'Acceso denegado a los productos de otro comercio', code: 'TENANT_FORBIDDEN' },
            { status: 403 }
          );
        }
        effectiveTenantId = session.tenantId || requestedTenantId || 'tenant_1';
      }
    } else {
      // Public Storefront query - derive strictly from domain / slug
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      effectiveTenantId = publicContext.tenant?.id || requestedTenantId || 'tenant_1';
    }

    let list = productsDb.filter(p => p.tenantId === effectiveTenantId);

    if (category && category !== 'all' && category !== 'Todos') {
      list = list.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ products: list, total: list.length, tenantId: effectiveTenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando productos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      price,
      comparePrice,
      stock = 10,
      sku,
      category = 'General',
      images = ['https://picsum.photos/seed/product/800/800'],
      featured = false,
      isDeal = false,
      rating = 5.0,
      reviewsCount = 0,
      attributes,
      variants,
      translations
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
    const currentCount = productsDb.filter(p => p.tenantId === tenant.id).length;
    const entitlementCheck = await TenantContextHelper.requireEntitlement(req, 'products.max', {
      targetTenantId: tenant.id,
      currentCount,
      increment: 1
    });

    if (!entitlementCheck.success) {
      return entitlementCheck.response;
    }

    const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      tenantId: tenant.id,
      title,
      slug: cleanSlug || `product-${Date.now()}`,
      description: body.description || '',
      price: Number(price),
      comparePrice: comparePrice ? Number(comparePrice) : undefined,
      stock: Number(stock),
      sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
      category,
      images,
      isFeatured: Boolean(featured),
      isDeal: Boolean(isDeal),
      rating: Number(rating) || 5.0,
      reviewsCount: Number(reviewsCount) || 0,
      tags: body.tags || [],
      status: 'ACTIVE',
      attributes,
      variants,
      translations,
      createdAt: new Date().toISOString()
    };

    productsDb.unshift(newProduct);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: newProduct.id,
      details: { title, price }
    });

    return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
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

    // Verify product belongs to this verified tenant
    const idx = productsDb.findIndex(p => p.id === id && p.tenantId === tenant.id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Producto no encontrado o no pertenece a este comercio', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    productsDb[idx] = {
      ...productsDb[idx],
      ...updates,
      tenantId: tenant.id // Prevent tampering tenantId
    };

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, product: productsDb[idx] });
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

    const idx = productsDb.findIndex(p => p.id === id && p.tenantId === tenant.id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Producto no encontrado en este comercio', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    productsDb.splice(idx, 1);

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
