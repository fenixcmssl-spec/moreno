import { NextRequest, NextResponse } from 'next/server';
import { SaaSCheckoutService } from '@/lib/services/saas-checkout.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = 'STRIPE',
      providerPaymentId,
      paymentId,
      sessionId,
      signature
    } = body;

    if (!providerPaymentId) {
      return NextResponse.json({
        success: false,
        error: 'Identificador de transacción del proveedor requerido'
      }, { status: 400 });
    }

    const result = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: provider.toUpperCase() === 'PAYPAL' ? 'PAYPAL' : 'STRIPE',
      providerPaymentId,
      paymentId,
      sessionId,
      signature,
      rawPayload: body
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Verificación de pago fallida'
      }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error procesando verificación de pago'
    }, { status: 500 });
  }
}
