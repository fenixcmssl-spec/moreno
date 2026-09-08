import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_ORDERS } from '@/lib/initialData';
import { AuditService } from '@/lib/services/audit.service';
import { Order } from '@/types';

let ordersDb: Order[] = [...INITIAL_ORDERS];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    let list = ordersDb;
    if (tenantId) {
      list = list.filter(o => o.tenantId === tenantId);
    }

    return NextResponse.json({ orders: list, total: list.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error listando pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
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
      shippingAddress
    } = body;

    if (!tenantId || !customerEmail || !total) {
      return NextResponse.json({ error: 'tenantId, customerEmail y total son requeridos' }, { status: 400 });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      tenantId,
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
      tenantId,
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
