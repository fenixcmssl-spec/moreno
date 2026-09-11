import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment.service';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('stripe-signature') || '';
    const body = await req.json();

    const { provider = 'STRIPE', eventId = body.id || `evt_${Date.now()}`, payload = body } = body;

    if (!eventId || !payload) {
      return NextResponse.json({ success: false, error: 'Payload de webhook incompleto' }, { status: 400 });
    }

    const result = await PaymentService.handleSaaSWebhook({
      provider: provider.toUpperCase() === 'PAYPAL' ? 'PAYPAL' : 'STRIPE',
      eventId,
      signature: signature || payload.signature,
      payload: payload.payload || payload
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error procesando webhook'
    }, { status: 500 });
  }
}
