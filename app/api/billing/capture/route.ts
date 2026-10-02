import { NextRequest, NextResponse } from 'next/server';
import { SaaSCheckoutService } from '@/lib/services/saas-checkout.service';

/**
 * /api/billing/capture
 * =========================================================================
 * FASE 1: CIERRE DEL APROVISIONAMIENTO GRATUITO Y PAGO PAYPAL REAL
 * 
 * Captura la orden en PayPal server-side y, si la captura es COMPLETED,
 * aprovisiona atómicamente el Tenant, Licencia, Suscripción y Factura.
 * =========================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      orderId,
      paypalOrderId,
      paymentId,
      sessionId,
      provider = 'PAYPAL'
    } = body;

    const targetOrderId = paypalOrderId || orderId || paymentId || sessionId;

    if (!targetOrderId) {
      return NextResponse.json({
        success: false,
        error: 'El identificador de orden de PayPal (orderId) es obligatorio para la captura.'
      }, { status: 400 });
    }

    const result = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: provider.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'PAYPAL',
      providerPaymentId: targetOrderId,
      paymentId,
      sessionId,
      rawPayload: body
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'La captura del pago no pudo completarse.'
      }, { status: 409 });
    }

    return NextResponse.json({
      ...result
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/billing/capture:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error capturando orden de pago'
    }, { status: 500 });
  }
}
