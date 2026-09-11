import { NextRequest, NextResponse } from 'next/server';
import { ClassifiedService } from '@/lib/services/classified.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

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
      const ad = ClassifiedService.getAdBySlug(targetTenantId, slug);
      if (!ad) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
      return NextResponse.json({ ad, tenantId: targetTenantId });
    }

    const ads = ClassifiedService.getAds(targetTenantId);
    const categories = ClassifiedService.getCategories(targetTenantId);

    return NextResponse.json({ ads, categories, total: ads.length, tenantId: targetTenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando anuncios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const publicContext = await TenantContextHelper.resolvePublicTenant(req);
    const targetTenant = publicContext.tenant;
    if (!targetTenant) return NextResponse.json({ error: 'Comercio no válido' }, { status: 400 });

    // Entitlement Check: ads.enabled
    const enabledCheck = await TenantContextHelper.requireEntitlement(publicContext, 'ads.enabled');
    if (!enabledCheck.success) {
      return enabledCheck.response;
    }

    // Entitlement Check: classifieds.ads_max
    const adsLimitCheck = await TenantContextHelper.requireEntitlement(publicContext, 'classifieds.ads_max', {
      increment: 1
    });
    if (!adsLimitCheck.success) {
      return adsLimitCheck.response;
    }

    const body = await req.json();
    const ad = ClassifiedService.createAd(targetTenant.id, {
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description || '',
      price: Number(body.price || 0),
      location: body.location || 'España',
      city: body.city || 'Madrid',
      images: body.images || ['https://picsum.photos/seed/ad/800/600'],
      status: 'PUBLISHED',
      featured: Boolean(body.featured),
      categoryId: body.categoryId || 'clcat_general',
      categoryName: body.categoryName || 'General',
      sellerId: body.sellerId || 'usr_anonymous',
      sellerName: body.sellerName || 'Vendedor',
      sellerRating: 5.0,
      phone: body.phone,
      contactEmail: body.contactEmail,
      attributes: body.attributes || {}
    });

    return NextResponse.json({ success: true, ad }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando anuncio' }, { status: 500 });
  }
}
