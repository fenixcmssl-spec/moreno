import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/services/webhook.service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const headers = {
      transmissionId: req.headers.get('paypal-transmission-id'),
      transmissionTime: req.headers.get('paypal-transmission-time'),
      transmissionSig: req.headers.get('paypal-transmission-sig'),
      certUrl: req.headers.get('paypal-cert-url'),
      authAlgo: req.headers.get('paypal-auth-algo')
    };

    // 1. Official PayPal Webhook Transmission Verification
    const verification = WebhookService.verifyPayPalSignature(rawBody, headers);
    if (!verification.valid) {
      return NextResponse.json({
        error: 'Firma de webhook PayPal inválida',
        reason: verification.reason
      }, { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Cuerpo de webhook PayPal malformado (no es JSON)' }, { status: 400 });
    }

    const eventId = event.id || headers.transmissionId;
    if (!eventId) {
      return NextResponse.json({ error: 'Evento de PayPal carece de ID o transmission-id' }, { status: 400 });
    }

    const eventType = event.event_type || 'unknown';

    // 2. Idempotency Check in Database / Cache
    const idempotency = await WebhookService.checkIdempotency('paypal', eventId);
    if (idempotency.isDuplicate) {
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: 'Evento de PayPal ya registrado y procesado previamente'
      }, { status: 200 });
    }

    // 3. Record Webhook Event as verified
    await WebhookService.recordWebhookEvent({
      provider: 'paypal',
      eventId,
      eventType,
      payload: event,
      signatureVerified: true
    });

    // 4. Securely process event actions on Payment, Subscription, License, Invoice
    let processError: string | undefined;
    try {
      await WebhookService.processPayPalEvent(event);
    } catch (err: any) {
      processError = err?.message || 'Error procesando evento';
    }

    // 5. Mark as processed
    await WebhookService.markProcessed(eventId, processError);

    if (processError) {
      return NextResponse.json({ error: processError }, { status: 500 });
    }

    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      signatureVerified: true
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Error interno procesando webhook PayPal'
    }, { status: 500 });
  }
}
