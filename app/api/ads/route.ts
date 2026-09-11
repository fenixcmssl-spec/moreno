import { NextRequest, NextResponse } from 'next/server';
import { ClassifiedService } from '@/lib/services/classified.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function GET(req: NextRequest) {
  try {
    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      
      // Entitlement Check: ads.enabled
      const entitlementCheck = await TenantContextHelper.requireEntitlement(auth.context, 'ads.enabled');
      if (!entitlementCheck.success) {
        return entitlementCheck.response;
      }
      targetTenantId = auth.context.tenant.id;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      
      // Entitlement Check: ads.enabled
      const entitlementCheck = await TenantContextHelper.requireEntitlement(publicContext, 'ads.enabled');
      if (!entitlementCheck.success) {
        return entitlementCheck.response;
      }
      targetTenantId = publicContext.tenant?.id || 'tenant_1';
    }

    const ads = ClassifiedService.getAds(targetTenantId);
    return NextResponse.json({ success: true, ads, total: ads.length, tenantId: targetTenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando anuncios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) return auth.response;

    // Entitlement Check: ads.enabled
    const enabledCheck = await TenantContextHelper.requireEntitlement(auth.context, 'ads.enabled');
    if (!enabledCheck.success) {
      return enabledCheck.response;
    }

    // Entitlement Check: classifieds.ads_max
    const adsLimitCheck = await TenantContextHelper.requireEntitlement(auth.context, 'classifieds.ads_max', {
      increment: 1
    });
    if (!adsLimitCheck.success) {
      return adsLimitCheck.response;
    }

    const body = await req.json();
    const ad = ClassifiedService.createAd(auth.context.tenant.id, {
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
      sellerId: auth.context.session?.userId || 'usr_anonymous',
      sellerName: auth.context.session?.name || 'Vendedor',
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
