import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { OrderService } from '@/lib/services/order.service';
import { AuditService } from '@/lib/services/audit.service';
import { isProductionMode } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const orderNumber = searchParams.get('orderNumber') || undefined;
    const search = searchParams.get('search') || orderNumber || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: requestedTenantId || undefined
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;

    const { orders, total } = await OrderService.listOrders(tenant.id, {
      status,
      search,
      limit,
      offset
    });

    return NextResponse.json({
      orders,
      total,
      tenantId: tenant.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      customerName,
      customerEmail,
      customerPhone,
      items = [],
      shippingAddress,
      paymentMethod = 'paypal',
      shippingMethod = 'correos_express',
      couponCode,
      notes,
      idempotencyKey: bodyIdempotencyKey
    } = body;

    // 1. Resolve tenant strictly from verified public domain/host context or authenticated session
    let targetTenantId: string | undefined;
    const publicContext = await TenantContextHelper.resolvePublicTenant(req);
    if (publicContext?.tenant?.id) {
      targetTenantId = publicContext.tenant.id;
    }

    const session = await TenantContextHelper.getSessionFromRequest(req);
    if (session?.tenantId && !targetTenantId) {
      targetTenantId = session.tenantId;
    }

    // In non-production only, allow dev fallback via tenant identifier if no domain header was attached
    if (!targetTenantId && !isProductionMode() && body.tenantId) {
      const verifiedTenant = await TenantContextHelper.findTenantByIdOrSlug(body.tenantId);
      if (verifiedTenant) {
        targetTenantId = verifiedTenant.id;
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo resolver la tienda asociada a este pedido. Acceso denegado.',
        failureCode: 'TENANT_NOT_RESOLVED'
      }, { status: 400 });
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email de cliente inválido.',
        failureCode: 'INVALID_CUSTOMER_EMAIL' 
      }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'El pedido debe contener al menos un producto.',
        failureCode: 'EMPTY_CART' 
      }, { status: 400 });
    }

    // Validate shipping address (no fake default addresses)
    if (!shippingAddress || typeof shippingAddress !== 'object' || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country) {
      return NextResponse.json({
        success: false,
        error: 'La dirección de envío completa es obligatoria (dirección, ciudad, código postal y país).',
        failureCode: 'SHIPPING_ADDRESS_REQUIRED'
      }, { status: 400 });
    }

    const idempotencyKey = req.headers.get('x-idempotency-key') || bodyIdempotencyKey || undefined;

    const result = await OrderService.createOrder({
      tenantId: targetTenantId,
      customerName: (customerName || 'Cliente').trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      shippingAddress: {
        address: String(shippingAddress.address).trim(),
        city: String(shippingAddress.city).trim(),
        postalCode: String(shippingAddress.postalCode || '00000').trim(),
        country: String(shippingAddress.country).trim(),
        state: shippingAddress.state ? String(shippingAddress.state).trim() : undefined
      },
      items: items.map((i: any) => ({
        productId: i.productId || i.id,
        quantity: Number(i.quantity) || 1,
        variant: i.variant
      })),
      paymentMethod,
      shippingMethod,
      couponCode: couponCode ? String(couponCode).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      idempotencyKey
    });

    if (!result.success || !result.order) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Error procesando el pedido.',
        failureCode: 'ORDER_PROCESSING_FAILED'
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, order: result.order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Error interno procesando pedido.' 
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, fulfillmentStatus, paymentStatus, trackingNumber, carrier } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant, session } = auth.context;

    const updated = await OrderService.updateOrderStatus(tenant.id, id, {
      status,
      fulfillmentStatus,
      paymentStatus,
      trackingNumber,
      carrier
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'ORDER_UPDATED',
      entity: 'Order',
      entityId: id,
      details: { status, fulfillmentStatus, trackingNumber }
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando pedido' }, { status: 500 });
  }
}
