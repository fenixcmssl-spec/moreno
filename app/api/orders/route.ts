import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_ORDERS } from '@/lib/initialData';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';
import { Order } from '@/types';

let ordersDb: Order[] = [...INITIAL_ORDERS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const orderNumber = searchParams.get('orderNumber');

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: requestedTenantId || undefined
    });

    if (!auth.success) {
      return auth.response;
    }

    const { tenant } = auth.context;

    let list = ordersDb.filter(o => o.tenantId === tenant.id);

    if (orderNumber) {
      list = list.filter(o => o.orderNumber.toLowerCase() === orderNumber.toLowerCase());
    }

    return NextResponse.json({ orders: list, total: list.length, tenantId: tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      items = [],
      total,
      subtotal,
      tax = 0,
      shippingCost = 0,
      discount = 0,
      paymentMethod = 'stripe',
      shippingAddress,
      notes
    } = body;

    // Resolve tenant from public domain/slug context
    const publicContext = await TenantContextHelper.resolvePublicTenant(req);
    const targetTenant = publicContext.tenant;

    if (!targetTenant) {
      return NextResponse.json({ error: 'Comercio no válido para procesar pedido' }, { status: 400 });
    }

    if (!customerEmail || total === undefined) {
      return NextResponse.json({ error: 'customerEmail y total son requeridos' }, { status: 400 });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      tenantId: targetTenant.id,
      orderNumber,
      customerName: customerName || 'Cliente',
      customerEmail,
      customerPhone,
      total: Number(total),
      subtotal: Number(subtotal || total),
      tax: Number(tax),
      shippingCost: Number(shippingCost),
      discount: Number(discount),
      status: 'completed',
      fulfillmentStatus: 'fulfilled',
      paymentMethod,
      paymentStatus: 'paid',
      shippingAddress,
      items,
      createdAt: new Date().toISOString()
    };

    ordersDb.unshift(newOrder);

    AuditService.log({
      tenantId: targetTenant.id,
      userEmail: customerEmail,
      action: 'ORDER_PLACED',
      entity: 'Order',
      entityId: newOrder.id,
      details: { orderNumber, total, customerEmail }
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error procesando pedido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, fulfillmentStatus, trackingNumber, carrier } = body;

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

    const idx = ordersDb.findIndex(o => o.id === id && o.tenantId === tenant.id);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Pedido no encontrado o no pertenece a este comercio', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    ordersDb[idx] = {
      ...ordersDb[idx],
      ...(status ? { status } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(carrier ? { carrier } : {})
    };

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'ORDER_UPDATED',
      entity: 'Order',
      entityId: id,
      details: { status, fulfillmentStatus, trackingNumber }
    });

    return NextResponse.json({ success: true, order: ordersDb[idx] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando pedido' }, { status: 500 });
  }
}
