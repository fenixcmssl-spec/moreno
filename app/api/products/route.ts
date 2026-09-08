import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_PRODUCTS } from '@/lib/initialData';
import { LicenseService } from '@/lib/services/license.service';
import { EntitlementService } from '@/lib/services/entitlement.service';
import { AuditService } from '@/lib/services/audit.service';
import { Product } from '@/types';

let productsDb: Product[] = [...INITIAL_PRODUCTS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let filtered = productsDb;

    if (tenantId) {
      filtered = filtered.filter(p => p.tenantId === tenantId);
    }

    if (category && category !== 'all' && category !== 'Todos') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ products: filtered, total: filtered.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando productos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
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

    if (!tenantId || !title || price === undefined) {
      return NextResponse.json(
        { error: 'tenantId, title y price son campos requeridos' },
        { status: 400 }
      );
    }

    // 1. Entitlement check on products.max
    const license = LicenseService.getByTenantId(tenantId);
    if (license) {
      const currentTenantProductsCount = productsDb.filter(p => p.tenantId === tenantId).length;
      const check = EntitlementService.canCreateResource(
        license.entitlements,
        'products',
        currentTenantProductsCount,
        1
      );

      if (!check.allowed) {
        return NextResponse.json(
          { error: check.message || 'Límite de productos alcanzado para tu plan' },
          { status: 403 }
        );
      }
    }

    const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      tenantId,
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
      tenantId,
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!id || !tenantId) {
      return NextResponse.json({ error: 'id y tenantId requeridos' }, { status: 400 });
    }

    const idx = productsDb.findIndex(p => p.id === id && p.tenantId === tenantId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    productsDb.splice(idx, 1);

    AuditService.log({
      tenantId,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando producto' }, { status: 500 });
  }
}
