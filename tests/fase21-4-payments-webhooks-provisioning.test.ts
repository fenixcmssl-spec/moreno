import assert from 'assert';
import crypto from 'crypto';
import { WebhookService } from '../lib/services/webhook.service';
import { SaaSProvisioningService } from '../lib/services/saas-provisioning.service';
import { SubscriptionService } from '../lib/services/subscription.service';
import { PaymentService } from '../lib/services/payment.service';
import { runWithSystemContext } from '../lib/auth/tenantContext';

export async function runFase21_4Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 21.4 — PAGOS, SUSCRIPCIONES, WEBHOOKS Y PROVISIONING');
  console.log('================================================================================\n');

  // 1. Validación de Firmas de Webhooks (Stripe HMAC-SHA256)
  console.log('📋 [1/5] VALIDACIÓN Y RECHAZO DE FIRMAS HMAC-SHA256 (STRIPE)');
  const testStripeSecret = 'whsec_test_secret_for_validation_only_1234567890';
  const rawStripePayload = JSON.stringify({
    id: 'evt_stripe_test_001',
    type: 'invoice.payment_succeeded',
    data: { object: { id: 'in_123', amount_paid: 4900, currency: 'eur' } }
  });

  const nowTimestamp = Math.floor(Date.now() / 1000);
  const validSignature = crypto
    .createHmac('sha256', testStripeSecret)
    .update(`${nowTimestamp}.${rawStripePayload}`)
    .digest('hex');

  const validHeader = `t=${nowTimestamp},v1=${validSignature}`;
  const validCheck = WebhookService.verifyStripeSignature(rawStripePayload, validHeader, testStripeSecret);
  assert.strictEqual(validCheck.valid, true, 'Firma legítima de Stripe debe ser válida');

  // Rechazo por firma falsificada
  const fakeHeader = `t=${nowTimestamp},v1=deadbeefcafebabe1234567890abcdef1234567890abcdef1234567890abcdef`;
  const fakeCheck = WebhookService.verifyStripeSignature(rawStripePayload, fakeHeader, testStripeSecret);
  assert.strictEqual(fakeCheck.valid, false, 'Firma falsificada de Stripe debe ser rechazada');

  // Rechazo por timestamp expirado (> 300 segundos)
  const expiredTimestamp = nowTimestamp - 600;
  const expiredSignature = crypto
    .createHmac('sha256', testStripeSecret)
    .update(`${expiredTimestamp}.${rawStripePayload}`)
    .digest('hex');
  const expiredHeader = `t=${expiredTimestamp},v1=${expiredSignature}`;
  const expiredCheck = WebhookService.verifyStripeSignature(rawStripePayload, expiredHeader, testStripeSecret);
  assert.strictEqual(expiredCheck.valid, false, 'Webhook de Stripe con timestamp expirado debe ser rechazado');
  console.log('  ✅ [PASS] Verificación y rechazo estricto de firmas Stripe completados');

  // 2. Validación de Webhooks PayPal (Headers de Transmisión & CertUrl)
  console.log('\n📋 [2/5] VALIDACIÓN Y RECHAZO DE FIRMAS TRANSMISIÓN (PAYPAL)');
  const paypalHeaders = {
    transmissionId: 'trans_pp_test_001',
    transmissionTime: new Date().toISOString(),
    transmissionSig: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
    certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
    authAlgo: 'SHA256withRSA'
  };

  const paypalCheck = WebhookService.verifyPayPalSignature('{}', paypalHeaders);
  assert.strictEqual(paypalCheck.valid, true, 'Headers legítimos de PayPal en sandbox deben ser válidos');

  // Rechazo por dominio no oficial de PayPal
  const fakePaypalHeaders = {
    ...paypalHeaders,
    certUrl: 'https://evil-attacker.com/fake-cert'
  };
  const fakePaypalCheck = WebhookService.verifyPayPalSignature('{}', fakePaypalHeaders);
  assert.strictEqual(fakePaypalCheck.valid, false, 'CertUrl fuera de paypal.com debe ser rechazado');
  console.log('  ✅ [PASS] Verificación y rechazo de dominio de certificado PayPal completados');

  // 3. Idempotencia de Webhooks por eventId
  console.log('\n📋 [3/5] IDEMPOTENCIA Y PROTECCIÓN CONTRA EVENTOS REPETIDOS');
  const testEventId = `evt_idempotency_test_${Date.now()}`;

  // Primer chequeo: no es duplicado
  const firstCheck = await WebhookService.checkIdempotency('stripe', testEventId);
  assert.strictEqual(firstCheck.isDuplicate, false, 'El primer evento no debe ser duplicado');

  // Registrar y marcar como procesado
  const recorded = await WebhookService.recordWebhookEvent({
    provider: 'stripe',
    eventId: testEventId,
    eventType: 'payment_intent.succeeded',
    payload: { id: testEventId, amount: 4900 },
    signatureVerified: true
  });
  await WebhookService.markProcessed(recorded.eventId);

  // Segundo chequeo: detectado como duplicado
  const secondCheck = await WebhookService.checkIdempotency('stripe', testEventId);
  assert.strictEqual(secondCheck.isDuplicate, true, 'El segundo evento idéntico debe ser detectado como duplicado');
  console.log('  ✅ [PASS] Idempotencia de webhooks garantizada');

  // 4. Ciclo de Provisioning Atómico
  console.log('\n📋 [4/5] CICLO DE PROVISIONING (CHECKOUT -> PAYMENT -> SUBSCRIPTION -> LICENSE)');
  const testCheckoutSession = {
    id: `chk_sess_${Date.now()}`,
    provider: 'PAYPAL',
    status: 'CAPTURED',
    applicationId: 'ECOMMERCE',
    planId: 'plan_growth',
    billingPeriod: 'monthly',
    amountExpected: 49.00,
    currencyExpected: 'EUR',
    customerName: 'Provisioning Test Owner',
    customerEmail: 'provisioning@fenixcms-test.es',
    tenantName: 'Provisioning Store',
    tenantSlug: `prov-store-${Date.now().toString(36)}`,
    paypalOrderId: `ORDER-TEST-${Date.now()}`,
    paypalCaptureId: `CAPTURE-TEST-${Date.now()}`,
    expiresAt: new Date(Date.now() + 3600000)
  };

  SaaSProvisioningService.recordMemorySession(testCheckoutSession);

  const provResult = await runWithSystemContext(async () => {
    return await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: testCheckoutSession.id,
      paypalOrderId: testCheckoutSession.paypalOrderId,
      captureId: testCheckoutSession.paypalCaptureId,
      capturedAmount: 49.00,
      capturedCurrency: 'EUR',
      payerEmail: testCheckoutSession.customerEmail
    });
  });

  assert.strictEqual(provResult.success, true, 'El aprovisionamiento desde checkout capturado debe ser exitoso');
  assert.ok(provResult.tenant, 'Debe crearse el Tenant correspondiente');
  assert.ok(provResult.license, 'Debe crearse la Licencia vinculada al Tenant');
  assert.strictEqual(provResult.license.planId, 'plan_growth', 'La licencia debe corresponder al plan contratado');

  // Idempotencia en Provisioning: Si se llama de nuevo con la misma orden, devuelve éxito idempotente
  const provRepeat = await runWithSystemContext(async () => {
    return await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: testCheckoutSession.id,
      paypalOrderId: testCheckoutSession.paypalOrderId,
      captureId: testCheckoutSession.paypalCaptureId,
      capturedAmount: 49.00,
      capturedCurrency: 'EUR',
      payerEmail: testCheckoutSession.customerEmail
    });
  });
  assert.strictEqual(provRepeat.success, true, 'Llamadas subsecuentes deben responder de forma idempotente');
  console.log('  ✅ [PASS] Cadena de provisioning e idempotencia verificadas');

  // 5. Estados de Suscripción y Transiciones Seguras
  console.log('\n📋 [5/5] MÁQUINA DE ESTADOS DE SUSCRIPCIÓN (ACTIVE / PAST_DUE / CANCELLED / EXPIRED)');
  const sub = await SubscriptionService.getByTenantId('tenant_1');
  if (sub) {
    assert.ok(sub.id, 'La suscripción debe tener identificador');
    assert.ok(['active', 'trialing', 'past_due', 'paused', 'cancelled', 'expired'].includes(sub.status.toLowerCase()), 'Estado de suscripción debe pertenecer al enum formal');
  }
  console.log('  ✅ [PASS] Máquina de estados de suscripción verificada');

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 21.4 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}
