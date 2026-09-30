import { NextRequest, NextResponse } from 'next/server';
import { ClassifiedService } from '@/lib/services/classified.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const adId = searchParams.get('id');
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : undefined;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;
    let isPrivileged = false;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      targetTenantId = auth.context.tenant.id;
      isPrivileged = true;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }
      targetTenantId = publicContext.tenant.id;
    }

    // Entitlement Check: ads.enabled
    const context = isPrivileged
      ? (await TenantContextHelper.requireTenant(req)).context
      : await TenantContextHelper.resolvePublicTenant(req);

    if (context) {
      const entitlementCheck = await TenantContextHelper.requireEntitlement(context, 'ads.enabled');
      if (!entitlementCheck.success) {
        return entitlementCheck.response;
      }
    }

    if (adId) {
      const ad = await ClassifiedService.getAdById(targetTenantId, adId);
      if (!ad) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, ad, tenantId: targetTenantId });
    }

    if (slug) {
      const ad = await ClassifiedService.getAdBySlug(targetTenantId, slug, isPrivileged);
      if (!ad) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 });
      return NextResponse.json({ success: true, ad, tenantId: targetTenantId });
    }

    const [adsResult, categories] = await Promise.all([
      ClassifiedService.getAds(targetTenantId, {
        category,
        search,
        status: isPrivileged ? status : undefined,
        allowUnpublished: isPrivileged,
        skip,
        take
      }),
      ClassifiedService.getCategories(targetTenantId)
    ]);

    return NextResponse.json({
      success: true,
      ads: adsResult.ads,
      total: adsResult.total,
      categories,
      tenantId: targetTenantId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando anuncios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;
    let authContext: any;
    let actor: any;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      targetTenantId = auth.context.tenant.id;
      authContext = auth.context;
      actor = {
        userId: session.userId,
        name: session.name,
        email: session.email,
        role: session.role
      };
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext || !publicContext.tenant) {
        return NextResponse.json({ error: 'Comercio no válido' }, { status: 400 });
      }
      targetTenantId = publicContext.tenant.id;
      authContext = publicContext;
      actor = session ? {
        userId: session.userId,
        name: session.name,
        email: session.email,
        role: session.role
      } : undefined;
    }

    // Entitlement Check: ads.enabled
    const enabledCheck = await TenantContextHelper.requireEntitlement(authContext, 'ads.enabled');
    if (!enabledCheck.success) {
      return enabledCheck.response;
    }

    // Entitlement Check: classifieds.ads_max
    const adsLimitCheck = await TenantContextHelper.requireEntitlement(authContext, 'classifieds.ads_max', {
      increment: 1
    });
    if (!adsLimitCheck.success) {
      return adsLimitCheck.response;
    }

    const body = await req.json();
    const ad = await ClassifiedService.createAd(
      targetTenantId,
      {
        title: body.title,
        slug: body.slug,
        description: body.description || '',
        price: Number(body.price || 0),
        location: body.location,
        city: body.city,
        images: body.images,
        category: body.category || body.categoryName,
        categoryId: body.categoryId,
        featured: Boolean(body.featured),
        sellerName: body.sellerName,
        sellerPhone: body.sellerPhone || body.phone,
        sellerEmail: body.sellerEmail || body.contactEmail,
        attributes: body.attributes || {},
        status: body.status
      },
      actor
    );

    return NextResponse.json({ success: true, ad }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando anuncio clasificado' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) return auth.response;

    const session = auth.context.session;
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'ID del anuncio requerido' }, { status: 400 });
    }

    const actor = {
      userId: session?.userId,
      name: session?.name,
      email: session?.email,
      role: session?.role
    };

    const updated = await ClassifiedService.updateAd(
      auth.context.tenant.id,
      body.id,
      {
        title: body.title,
        slug: body.slug,
        description: body.description,
        price: body.price !== undefined ? Number(body.price) : undefined,
        location: body.location,
        city: body.city,
        images: body.images,
        category: body.category || body.categoryName,
        categoryId: body.categoryId,
        featured: body.featured,
        sellerName: body.sellerName,
        sellerPhone: body.sellerPhone || body.phone,
        sellerEmail: body.sellerEmail || body.contactEmail,
        attributes: body.attributes,
        status: body.status
      },
      actor
    );

    return NextResponse.json({ success: true, ad: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando anuncio' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) return auth.response;

    const session = auth.context.session;
    const body = await req.json();

    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'ID y estado requeridos' }, { status: 400 });
    }

    const actor = {
      userId: session?.userId,
      name: session?.name,
      email: session?.email,
      role: session?.role
    };

    const updated = await ClassifiedService.updateAdStatus(
      auth.context.tenant.id,
      body.id,
      body.status,
      actor
    );

    return NextResponse.json({ success: true, ad: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error modificando estado del anuncio' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenant(req);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID del anuncio requerido' }, { status: 400 });
    }

    const session = auth.context.session;
    const actor = {
      userId: session?.userId,
      name: session?.name,
      email: session?.email,
      role: session?.role
    };

    await ClassifiedService.deleteAd(auth.context.tenant.id, id, actor);

    return NextResponse.json({ success: true, message: 'Anuncio eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando anuncio' }, { status: 400 });
  }
}
