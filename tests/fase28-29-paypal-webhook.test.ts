import { WebhookService } from '../lib/services/webhook.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runFase28And29Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASES 28 & 29 — PAYPAL REAL & MÁQUINA DE ESTADOS WEBHOOK');
  console.log('================================================================================');

  console.log('\n📋 [1/4] VALIDACIÓN DE CABECERAS DE TRANSMISIÓN DE PAYPAL');
  {
    const validHeaders = {
      transmissionId: 'trans_9988112233',
      transmissionTime: new Date().toISOString(),
      transmissionSig: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWY=',
      certUrl: 'https://api.paypal.com/v1/notifications/certs/CERT-12345',
      authAlgo: 'SHA256withRSA'
    };

    const verification = WebhookService.verifyPayPalSignature('{"id":"evt_123"}', validHeaders, 'WH-TEST-PAYPAL-ID');
    assert(verification.valid === true, 'Cabeceras legítimas de PayPal pasan la verificación');

    const invalidCert = {
      ...validHeaders,
      certUrl: 'https://evil-hacker.com/cert.pem'
    };
    const badCertRes = WebhookService.verifyPayPalSignature('{"id":"evt_123"}', invalidCert, 'WH-TEST-PAYPAL-ID');
    assert(badCertRes.valid === false, 'CertUrl fuera del dominio oficial .paypal.com es rechazado');
  }

  console.log('\n📋 [2/4] MÁQUINA DE ESTADOS: CHECKOUT.ORDER.APPROVED VS PAYMENT.CAPTURE.COMPLETED');
  {
    // Probar que CHECKOUT.ORDER.APPROVED procesa el evento como pendiente de captura
    const approvedEvent = {
      event_type: 'CHECKOUT.ORDER.APPROVED',
      id: `evt_test_appr_${Date.now()}`,
      resource: {
        id: 'ORDER-PAYPAL-9988',
        custom_id: 'tenant_demo'
      }
    };

    const resApproved = await WebhookService.processPayPalEvent(approvedEvent);
    assert(resApproved.success === true, 'Evento CHECKOUT.ORDER.APPROVED es reconocido y registrado como pendiente de captura');

    // Probar que PAYMENT.CAPTURE.COMPLETED procesa la captura real
    const captureCompletedEvent = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      id: `evt_test_cap_${Date.now()}`,
      resource: {
        id: 'CAPTURE-PAYPAL-1122',
        custom_id: 'tenant_demo',
        invoice_number: 'FNX-INV-TEST-001'
      }
    };

    const resCapture = await WebhookService.processPayPalEvent(captureCompletedEvent);
    assert(resCapture.success === true, 'Evento PAYMENT.CAPTURE.COMPLETED ejecuta la confirmación efectiva');
  }

  console.log('\n📋 [3/4] IDEMPOTENCIA DE EVENTOS WEBHOOK POR EVENTID');
  {
    const uniqueEventId = `evt_idempotency_${Date.now()}`;
    
    // Primer registro
    const firstCheck = await WebhookService.checkIdempotency('paypal', uniqueEventId);
    assert(firstCheck.isDuplicate === false, 'Primer evento no es duplicado');

    await WebhookService.recordWebhookEvent({
      provider: 'paypal',
      eventId: uniqueEventId,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      payload: { test: true },
      signatureVerified: true
    });

    await WebhookService.markEventProcessed(uniqueEventId);

    // Segundo registro con el mismo eventId
    const secondCheck = await WebhookService.checkIdempotency('paypal', uniqueEventId);
    assert(secondCheck.isDuplicate === true, 'Mismo eventId repetido es detectado como duplicado');
  }

  console.log('\n📋 [4/4] RECHAZO DE FIRMAS FALSIFICADAS');
  {
    const tamperedHeaders = {
      transmissionId: 'trans_fake_123',
      transmissionTime: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 min expira
      transmissionSig: 'invalid_sig'
    };

    const res = WebhookService.verifyPayPalSignature('{}', tamperedHeaders);
    assert(res.valid === false, 'Firma con timestamp expirado (>20m) o formato inválido es rechazada');
  }

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LAS FASES 28 Y 29 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}

if (require.main === module) {
  runFase28And29Tests().catch(err => {
    console.error('Error en suite FASE 28 & 29:', err);
    process.exit(1);
  });
}
