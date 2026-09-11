import { NextRequest, NextResponse } from 'next/server';
import { CheckoutSchema } from '@/lib/validators';
import { StorefrontCheckoutService } from '@/lib/services/storefront-checkout.service';
import { AuditService } from '@/lib/services/audit.service';
import { SecurityService } from '@/lib/security/security.service';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting protection against card testing and automated abuse
    const rateLimit = SecurityService.applyRateLimit(req, 15, 60, 'checkout_orders');
    if (rateLimit.limited && rateLimit.response) {
      return rateLimit.response;
    }

    const rawBody = await req.json();
    const body = SecurityService.sanitizePayload(rawBody);
    const validated = CheckoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de pedido inválidos',
        issues: validated.error.issues
      }, { status: 400 });
    }

    const { tenantId, items, paymentMethod, shippingMethod, couponCode, customerName, customerEmail, customerPhone, shippingAddress, notes } = validated.data;

    // Process order with StorefrontCheckoutService
    const result = await StorefrontCheckoutService.createStorefrontOrder({
      tenantId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state || shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country
      },
      items,
      paymentMethod,
      shippingMethod,
      couponCode,
      notes
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error creando pedido en tienda'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: result.order
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error en el procesamiento del checkout'
    }, { status: 500 });
  }
}
