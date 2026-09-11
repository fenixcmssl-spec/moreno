import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/services/webhook.service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('stripe-signature');

    // 1. Official Stripe Signature Verification (HMAC-SHA256 with timestamp tolerance)
    const verification = WebhookService.verifyStripeSignature(rawBody, signatureHeader);
    if (!verification.valid) {
      return NextResponse.json({
        error: 'Firma de webhook Stripe inválida',
        reason: verification.reason
      }, { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Cuerpo de webhook Stripe malformado (no es JSON)' }, { status: 400 });
    }

    const eventId = event.id;
    if (!eventId) {
      return NextResponse.json({ error: 'Evento de Stripe carece de ID' }, { status: 400 });
    }

    const eventType = event.type || 'unknown';

    // 2. Idempotency Check in Database / Cache
    const idempotency = await WebhookService.checkIdempotency('stripe', eventId);
    if (idempotency.isDuplicate) {
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: 'Evento de Stripe ya registrado y procesado previamente'
      }, { status: 200 });
    }

    // 3. Record Webhook Event as verified
    await WebhookService.recordWebhookEvent({
      provider: 'stripe',
      eventId,
      eventType,
      payload: event,
      signatureVerified: true
    });

    // 4. Securely process event actions on Payment, Subscription, License, Invoice
    let processError: string | undefined;
    try {
      await WebhookService.processStripeEvent(event);
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
      error: error?.message || 'Error interno procesando webhook Stripe'
    }, { status: 500 });
  }
}
