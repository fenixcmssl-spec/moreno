import { NextRequest, NextResponse } from 'next/server';
import { SaaSCheckoutService } from '@/lib/services/saas-checkout.service';
import { isProductionMode } from '@/lib/prisma';

/**
 * /api/tenants/provision
 * =========================================================================
 * FASE 1: CIERRE DEL APROVISIONAMIENTO GRATUITO Y PAGO PAYPAL REAL
 * 
 * Regla de Oro: NO PAYMENT CAPTURED = NO PROVISIONING.
 * 
 * Este endpoint ya NO permite la creación libre ni gratuita de tenants
 * a partir de parámetros arbitrarios enviados por el cliente.
 * 
 * Exige obligatoriamente:
 * 1. `paypalOrderId` o `paymentId` registrado en una sesión de checkout.
 * 2. Validación y captura real de fondos con PayPal API en servidor.
 * 3. Aprovisionamiento atómico vinculado a la orden confirmada.
 * =========================================================================
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      paypalOrderId,
      orderId,
      paymentId,
      sessionId,
      provider = 'PAYPAL',
      providerPaymentId
    } = body;

    const transactionIdentifier = paypalOrderId || orderId || providerPaymentId || paymentId || sessionId;

    if (!transactionIdentifier) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acceso denegado: Se requiere un identificador de orden de pago capturado y validado por la pasarela (NO PAYMENT CAPTURED = NO PROVISIONING).' 
        },
        { status: 401 }
      );
    }

    // Ejecutar verificación y captura server-side con la pasarela oficial
    const result = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: provider.toUpperCase() === 'STRIPE' ? 'STRIPE' : 'PAYPAL',
      providerPaymentId: transactionIdentifier,
      paymentId: paymentId || transactionIdentifier,
      sessionId: sessionId || transactionIdentifier,
      rawPayload: body
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo verificar la captura del pago en PayPal. Aprovisionamiento denegado.'
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
      license: result.license,
      subscription: result.subscription,
      invoice: result.invoice,
      payment: result.payment,
      message: 'Comercio, licencia y suscripción aprovisionados con éxito tras verificar el pago.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/tenants/provision:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Error en la verificación y aprovisionamiento del comercio' 
      },
      { status: 500 }
    );
  }
}
