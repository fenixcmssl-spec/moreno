import { NextRequest, NextResponse } from 'next/server';
import { CheckoutSchema } from '@/lib/validators';
import { PaymentService } from '@/lib/services/payment.service';
import { AuditService } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CheckoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de pedido inválidos',
        issues: validated.error.issues
      }, { status: 400 });
    }

    const { tenantId, items, paymentMethod, shippingMethod, couponCode, customerName, customerEmail, shippingAddress, notes } = validated.data;

    // Server-side calculation of financial figures (Point 2, 18 & 24)
    const calculation = PaymentService.calculateTotals({
      items,
      couponDiscountPct: couponCode === 'FENIX10' ? 10 : 0,
      shippingMethod,
      taxRate: 0.21
    });

    const orderNumber = `FNX-${Date.now().toString().slice(-6)}`;
    const isInstantPayment = paymentMethod === 'stripe' || paymentMethod === 'paypal';

    AuditService.log({
      tenantId,
      userEmail: customerEmail,
      action: 'ORDER_CREATED',
      entity: 'Order',
      entityId: orderNumber,
      details: {
        total: calculation.total,
        paymentMethod,
        itemsCount: items.length
      }
    });

    return NextResponse.json({
      success: true,
      order: {
        orderNumber,
        tenantId,
        customerName,
        customerEmail,
        shippingAddress,
        items,
        calculation,
        paymentMethod,
        paymentStatus: isInstantPayment ? 'PAID' : 'PENDING',
        orderStatus: isInstantPayment ? 'PROCESSING' : 'PENDING',
        carrier: shippingMethod === 'correos_express' ? 'Correos Express 24h' : 'Correos Paq Estándar',
        trackingNumber: `CE${Math.floor(100000000 + Math.random() * 900000000)}ES`,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error en el procesamiento del checkout'
    }, { status: 500 });
  }
}
