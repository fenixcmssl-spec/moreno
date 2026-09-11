import crypto from 'crypto';
import { WebhookService } from '../lib/services/webhook.service';
import { LicenseService } from '../lib/services/license.service';
import { SubscriptionService } from '../lib/services/subscription.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runWebhookSecurityTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DE PASO 12 — WEBHOOK SECURITY');
  console.log('====================================================\n');

  const testSecret = 'whsec_test_secret_for_fenix_cms_crypto_key_2026';

  // -------------------------------------------------------------------------
  // Test Suite 1: Verificación Oficial de Firma Stripe (HMAC-SHA256)
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Verificación Oficial de Firma Stripe (HMAC-SHA256) ---');

  const stripePayload = JSON.stringify({
    id: 'evt_stripe_real_001',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_123456',
        amount_paid: 2900,
        customer_email: 'tienda@fenixcms.es',
        metadata: {
          licenseKey: 'FNX-PRO-9823-X981-DEMO',
          tenantId: 'tenant_demo'
        }
      }
    }
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validStripeSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${nowSeconds}.${stripePayload}`, 'utf8')
    .digest('hex');

  const validStripeHeader = `t=${nowSeconds},v1=${validStripeSignature}`;

  // 1. Valid signature check
  const validResult = WebhookService.verifyStripeSignature(stripePayload, validStripeHeader, testSecret);
  assert(validResult.valid === true, 'Firma HMAC-SHA256 válida con timestamp actual debe ser aceptada');

  // 2. Missing signature header
  const missingResult = WebhookService.verifyStripeSignature(stripePayload, null, testSecret);
  assert(missingResult.valid === false, 'Header stripe-signature ausente debe ser rechazado');
  assert(Boolean(missingResult.reason), 'Debe incluir motivo de rechazo');

  // 3. Tampered payload check
  const tamperedPayload = stripePayload.replace('2900', '9900');
  const tamperedResult = WebhookService.verifyStripeSignature(tamperedPayload, validStripeHeader, testSecret);
  assert(tamperedResult.valid === false, 'Payload alterado debe invalidar la firma criptográfica');

  // 4. Replay attack check (Timestamp > 300 seconds ago)
  const oldSeconds = nowSeconds - 360; // 6 minutes ago
  const oldSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${oldSeconds}.${stripePayload}`, 'utf8')
    .digest('hex');
  const expiredHeader = `t=${oldSeconds},v1=${oldSignature}`;

  const expiredResult = WebhookService.verifyStripeSignature(stripePayload, expiredHeader, testSecret);
  assert(expiredResult.valid === false, 'Timestamp expirado (> 300s) debe ser rechazado para prevenir ataques de repetición (Replay Attacks)');
  assert(expiredResult.reason?.includes('expirado') || expiredResult.reason?.includes('desfasado'), 'Motivo debe indicar timestamp expirado');

  // -------------------------------------------------------------------------
  // Test Suite 2: Verificación de Cabeceras de Transmisión PayPal
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Verificación de Cabeceras de Transmisión PayPal ---');

  const paypalPayload = JSON.stringify({
    id: 'WH-PAYPAL-EVT-001',
    event_type: 'PAYMENT.SALE.COMPLETED',
    resource: {
      id: 'PAY-123456789',
      invoice_number: 'FNX-PRO-9823-X981-DEMO',
      amount: { total: '29.00', currency: 'EUR' }
    }
  });

  const validPayPalHeaders = {
    transmissionId: 'transmission_uuid_1001',
    transmissionTime: new Date().toISOString(),
    transmissionSig: 'dGVzdF9zaWduYXR1cmVfYmFzZTY0X2hhc2hfdmFsaWQ=',
    certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1234.pem',
    authAlgo: 'SHA256withRSA'
  };

  const validPayPalResult = WebhookService.verifyPayPalSignature(paypalPayload, validPayPalHeaders);
  assert(validPayPalResult.valid === true, 'Headers oficiales de transmisión de PayPal deben ser válidos');

  // Malicious certificate domain test
  const spoofedCertHeaders = {
    ...validPayPalHeaders,
    certUrl: 'https://attacker-domain.com/v1/notifications/certs/CERT-1234.pem'
  };
  const spoofedCertResult = WebhookService.verifyPayPalSignature(paypalPayload, spoofedCertHeaders);
  assert(spoofedCertResult.valid === false, 'Certificado desde dominio no oficial de PayPal debe ser RECHAZADO');

  // Missing transmission headers test
  const missingPayPalHeaders = { transmissionId: null, transmissionTime: null, transmissionSig: null };
  const missingPayPalResult = WebhookService.verifyPayPalSignature(paypalPayload, missingPayPalHeaders);
  assert(missingPayPalResult.valid === false, 'Headers de transmisión incompletos deben ser rechazados');

  // -------------------------------------------------------------------------
  // Test Suite 3: Idempotencia Estricta (Mismo eventId dos veces)
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Idempotencia Estricta (Mismo eventId dos veces) ---');

  const uniqueEventId = `evt_idempotency_test_${Date.now()}`;

  // 1. First event check
  const firstCheck = await WebhookService.checkIdempotency('stripe', uniqueEventId);
  assert(firstCheck.isDuplicate === false, 'Primera recepción del evento NO es duplicada');

  // 2. Record and mark processed
  await WebhookService.recordWebhookEvent({
    provider: 'stripe',
    eventId: uniqueEventId,
    eventType: 'invoice.payment_succeeded',
    payload: { id: uniqueEventId, amount: 29 },
    signatureVerified: true
  });
  await WebhookService.markProcessed(uniqueEventId);

  // 3. Second event check with same eventId
  const secondCheck = await WebhookService.checkIdempotency('stripe', uniqueEventId);
  assert(secondCheck.isDuplicate === true, 'Segunda recepción del MISMO eventId debe detectarse como DUPLICADO');
  assert(secondCheck.eventRecord?.processed === true, 'El registro original debe marcarse como procesado');

  // -------------------------------------------------------------------------
  // Test Suite 4: Modificación de Payment / Subscription / License solo tras verificar
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Modificación de Recursos Solo Tras Verificación ---');

  // Pre-seed test license
  const lic = LicenseService.getByLicenseKey('FNX-PRO-9823-X981-DEMO');
  assert(Boolean(lic), 'Licencia demo debe existir');
  const initialValidTo = new Date(lic!.validTo).getTime();

  // Process verified Stripe Event
  const processResult = await WebhookService.processStripeEvent({
    id: `evt_proc_${Date.now()}`,
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_processed_99',
        amount_paid: 2900,
        metadata: {
          licenseKey: 'FNX-PRO-9823-X981-DEMO',
          tenantId: 'tenant_demo'
        }
      }
    }
  });

  assert(processResult.success === true, 'Procesamiento de evento verificado debe ser exitoso');

  // Verify license was renewed
  const updatedLic = LicenseService.getByLicenseKey('FNX-PRO-9823-X981-DEMO');
  const updatedValidTo = new Date(updatedLic!.validTo).getTime();
  assert(updatedValidTo > initialValidTo, 'Licencia debe renovar fecha de validez tras confirmación del webhook');
  assert(updatedLic!.status === 'active', 'Licencia debe estar en estado active');

  console.log('\n====================================================');
  console.log('🏁 RESULTADO PASO 12: TODAS LAS PRUEBAS PASADAS CON ÉXITO');
  console.log('====================================================');
}

runWebhookSecurityTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
