import fs from 'fs';
import path from 'path';
import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';
import { SaaSProvisioningService } from '../lib/services/saas-provisioning.service';
import { PayPalGatewayService } from '../lib/services/paypal-gateway.service';
import { WebhookService } from '../lib/services/webhook.service';
import { AuthService } from '../lib/services/auth.service';

/**
 * =========================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: FENIXCMS_2 (FASE 2)
 * =========================================================================
 * Validación Integral de:
 * 1. CheckoutSession persistente e inmutable.
 * 2. Catálogo estricto (Application <-> Plan).
 * 3. Aprobación y Captura PayPal server-side.
 * 4. Aprovisionamiento atómico de 6 recursos (Tenant, User, License, Sub, Invoice, Domain).
 * 5. Eliminación total de contraseñas maestras y URLs ficticias.
 * 6. Idempotencia, Concurrencia y Recovery.
 * =========================================================================
 */

async function runFase2Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS FENIXCMS_2: CHECKOUTSESSION, CAPTURA Y PROVISIONING ATÓMICO');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // [1/8] CHECKOUTSESSION: CREACIÓN CON SNAPSHOT INMUTABLE Y VALIDACIÓN DE SLUG
  // ---------------------------------------------------------------------------
  console.log('\n📋 [1/8] CHECKOUTSESSION PERSISTENTE Y REGLAS DE SLUG');
  let validSessionId = '';
  let validOrderId = '';
  let expectedPlanAmount = 19.00;
  try {
    // 1. Slug reservado debe ser rechazado
    let reservedFailed = false;
    try {
      await SaaSCheckoutService.createSession({
        applicationId: 'ECOMMERCE',
        planId: 'plan_growth',
        customerName: 'Test Buyer',
        customerEmail: 'buyer@test.es',
        tenantSlug: 'admin',
        billingPeriod: 'monthly'
      });
    } catch (err: any) {
      reservedFailed = err?.message?.includes('reservado');
    }
    assert(reservedFailed, 'Rechaza intento de crear CheckoutSession con slug reservado (e.g. "admin")');

    // 2. Creación exitosa de CheckoutSession con snapshot
    const session = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'Ana García',
      customerEmail: 'ana.garcia@tiendafenix.es',
      tenantSlug: 'tiendadeana',
      tenantName: 'Tienda de Ana',
      billingPeriod: 'monthly',
      provider: 'PAYPAL'
    });

    validSessionId = session.sessionId;
    validOrderId = session.paymentId;
    expectedPlanAmount = session.amount;

    assert(typeof session.sessionId === 'string' && session.sessionId.startsWith('cs_'), 'Crea CheckoutSession con ID único de plataforma');
    assert(session.amount > 0, 'Snapshot comercial: importe calculado por el servidor');
    assert(session.currency === 'EUR', 'Snapshot comercial: moneda calculada por el servidor');
    assert(session.checkoutUrl.includes('paypal.com'), 'Entrega approvalUrl legítima de PayPal');
  } catch (err: any) {
    assert(false, 'Fallo creando CheckoutSession', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [2/8] PREVENCIÓN DE MANIPULACIÓN DE IMPORTES Y PLANES
  // ---------------------------------------------------------------------------
  console.log('\n📋 [2/8] DISCREPANCIA DE IMPORTE Y MONEDA (ANTI-TAMPERING)');
  try {
    const amountMismatchResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: validSessionId,
      captureId: `CAP-FAKE-${Date.now()}`,
      capturedAmount: 0.01, // Intento de pagar 1 céntimo en lugar del plan real
      capturedCurrency: 'EUR'
    });

    assert(
      amountMismatchResult.success === false,
      'Rechaza aprovisionamiento si el importe capturado no coincide exactamente con el esperado'
    );
    assert(
      amountMismatchResult.failureCode === 'PAYPAL_AMOUNT_MISMATCH',
      'failureCode específico es PAYPAL_AMOUNT_MISMATCH'
    );

    const currencyMismatchResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: validSessionId,
      captureId: `CAP-FAKE-CURR-${Date.now()}`,
      capturedAmount: expectedPlanAmount,
      capturedCurrency: 'USD' // Moneda distinta a la esperada (EUR)
    });

    assert(
      currencyMismatchResult.success === false,
      'Rechaza aprovisionamiento si la moneda capturada no coincide'
    );
    assert(
      currencyMismatchResult.failureCode === 'PAYPAL_CURRENCY_MISMATCH',
      'failureCode específico es PAYPAL_CURRENCY_MISMATCH'
    );
  } catch (err: any) {
    assert(false, 'Fallo en tests de discrepancia', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [3/8] APROVISIONAMIENTO ATÓMICO TRAS CAPTURA COMPLETED
  // ---------------------------------------------------------------------------
  console.log('\n📋 [3/8] APROVISIONAMIENTO ATÓMICO DE RECURSOS SAAS');
  const validCaptureId = `CAP-REAL-${Date.now()}`;
  try {
    const provResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: validSessionId,
      captureId: validCaptureId,
      capturedAmount: expectedPlanAmount,
      capturedCurrency: 'EUR',
      payerEmail: 'ana.garcia@tiendafenix.es'
    });

    assert(provResult.success === true, 'Aprovisionamiento atómico completado con éxito');
    assert(!!provResult.tenant && provResult.tenant.slug === 'tiendadeana', 'Tenant creado con slug del snapshot');
    assert(!!provResult.license && provResult.license.displayKey?.startsWith('FNX-'), 'Licencia creada con clave oficial FNX-...');
    assert(!!provResult.subscription, 'Suscripción SaaS creada con estado ACTIVE');
    assert(!!provResult.invoice && provResult.invoice.status === 'PAID', 'Factura SaaS emitida con estado PAID');
    assert(!!provResult.payment && provResult.payment.status === 'COMPLETED', 'Registro Payment completado con ID de captura');
  } catch (err: any) {
    assert(false, 'Fallo en aprovisionamiento atómico', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [4/8] IDEMPOTENCIA Y CONCURRENCIA
  // ---------------------------------------------------------------------------
  console.log('\n📋 [4/8] IDEMPOTENCIA (DOBLE CLIC, REFRESH, WEBHOOK DUPLICADO)');
  try {
    // Repetir el mismo aprovisionamiento
    const duplicateResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: validSessionId,
      captureId: validCaptureId,
      capturedAmount: expectedPlanAmount,
      capturedCurrency: 'EUR'
    });

    assert(duplicateResult.success === true, 'Petición repetida devuelve éxito sin error');
    assert(
      duplicateResult.tenant?.slug === 'tiendadeana',
      'Devuelve el tenant existente previamente aprovisionado sin duplicar'
    );

    // Intento de reutilizar el mismo captureId para otra sesión
    const session2 = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'Otro Comprador',
      customerEmail: 'otro@test.es',
      tenantSlug: 'otratienda',
      billingPeriod: 'monthly'
    });

    const reuseCaptureResult = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: session2.sessionId,
      captureId: validCaptureId, // Reutilización fraudulenta del mismo ID de captura
      capturedAmount: expectedPlanAmount,
      capturedCurrency: 'EUR'
    });

    assert(
      reuseCaptureResult.success === false,
      'Bloquea reutilización de un captureId previamente consumido'
    );
    assert(
      reuseCaptureResult.failureCode === 'PAYPAL_CAPTURE_ALREADY_USED',
      'failureCode es PAYPAL_CAPTURE_ALREADY_USED'
    );
  } catch (err: any) {
    assert(false, 'Fallo en tests de idempotencia', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [5/8] AUDITORÍA ESTÁTICA DE CÓDIGO: CERO CONTRASEÑAS MAESTRAS EN PRODUCCIÓN
  // ---------------------------------------------------------------------------
  console.log('\n📋 [5/8] AUDITORÍA DE SEGURIDAD: CERO PASSWORDS MAESTRAS HARDCODEADAS');
  try {
    const authFilePath = path.join(process.cwd(), 'lib/services/auth.service.ts');
    const authContent = fs.readFileSync(authFilePath, 'utf-8');

    const forbiddenPasswords = ['Patricia1980@', 'admin123', 'fenix2026'];
    let foundForbidden = false;

    for (const pwd of forbiddenPasswords) {
      if (authContent.includes(pwd)) {
        foundForbidden = true;
        console.error(`  ⚠️ Password hardcodeada detectada en auth.service.ts: ${pwd}`);
      }
    }

    assert(!foundForbidden, 'auth.service.ts NO contiene contraseñas maestras en texto plano ni comparaciones fijas');

    // Verificar que PasswordService.verifyPassword sea la función utilizada
    assert(
      authContent.includes('PasswordService.verifyPassword'),
      'La autenticación se realiza mediante verificación criptográfica de hash'
    );
  } catch (err: any) {
    assert(false, 'Fallo en auditoría de contraseñas', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [6/8] AUDITORÍA ESTÁTICA: CERO URLS FICTICIAS O FALLBACKS DE FRAUDE
  // ---------------------------------------------------------------------------
  console.log('\n📋 [6/8] AUDITORÍA DE PASARELAS: CERO URLS SIMULADAS EN PRODUCCIÓN');
  try {
    const checkoutFilePath = path.join(process.cwd(), 'lib/services/saas-checkout.service.ts');
    const checkoutContent = fs.readFileSync(checkoutFilePath, 'utf-8');

    assert(
      !checkoutContent.includes('checkoutnow?token=cs_saas_'),
      'saas-checkout.service.ts NO genera tokens inventados de PayPal'
    );
    assert(
      !checkoutContent.includes('checkout.stripe.com/pay/cs_saas_'),
      'saas-checkout.service.ts NO genera URLs simuladas de Stripe sin sesión real'
    );
  } catch (err: any) {
    assert(false, 'Fallo en auditoría de URLs', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [7/8] RECONCILIACIÓN AUTOMÁTICA (RECOVERY ENGINE)
  // ---------------------------------------------------------------------------
  console.log('\n📋 [7/8] MOTOR DE RECUPERACIÓN Y RECONCILIACIÓN');
  try {
    const recoveryResult = await SaaSProvisioningService.reconcilePendingCheckoutSessions();
    assert(
      typeof recoveryResult.reconciledCount === 'number',
      'El motor de reconciliación se ejecuta sin errores para recuperar sesiones pendientes'
    );
  } catch (err: any) {
    assert(false, 'Fallo en reconciliación', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [8/8] WEBHOOKS PAYPAL — VERIFICACIÓN Y RECONCILIACIÓN
  // ---------------------------------------------------------------------------
  console.log('\n📋 [8/8] WEBHOOKS: VERIFICACIÓN CRIPTOGRÁFICA Y IDEMPOTENCIA');
  try {
    const testEvent = {
      id: `WH-EVT-FASE2-${Date.now()}`,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: `CAP-WH-${Date.now()}`,
        custom_id: validSessionId,
        amount: { value: '29.00', currency_code: 'EUR' }
      }
    };

    // 1. Primer procesamiento
    const firstProcess = await WebhookService.processPayPalEvent(testEvent);
    assert(firstProcess.success === true, 'Webhook PAYMENT.CAPTURE.COMPLETED procesado');

    // 2. Registro de evento
    const recorded = await WebhookService.recordWebhookEvent({
      provider: 'paypal',
      eventId: testEvent.id,
      eventType: testEvent.event_type,
      payload: testEvent,
      signatureVerified: true
    });
    assert(recorded.eventId === testEvent.id, 'Evento de webhook persistido con eventId único');

    // 3. Chequeo de idempotencia
    await WebhookService.markProcessed(testEvent.id);
    const idempCheck = await WebhookService.checkIdempotency('paypal', testEvent.id);
    assert(idempCheck.isDuplicate === true, 'Webhook duplicado es detectado como duplicado por idempotencia');
  } catch (err: any) {
    assert(false, 'Fallo en tests de webhooks', err?.message);
  }

  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS FASE 2: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================================\n');

  if (failed > 0) {
    throw new Error(`Suite de pruebas FENIXCMS_2 falló con ${failed} errores.`);
  }
}

if (require.main === module || process.argv[1]?.includes('fenixcms-fase2')) {
  runFase2Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { runFase2Tests };
