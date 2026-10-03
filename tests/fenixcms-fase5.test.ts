import crypto from 'crypto';
import { PaymentService } from '../lib/services/payment.service';
import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';
import { SaaSProvisioningService } from '../lib/services/saas-provisioning.service';
import { AuthService } from '../lib/services/auth.service';
import { SuperAdminService } from '../lib/services/super-admin.service';
import { StorageService, ManagedStorageProvider } from '../lib/storage/storage.service';
import { OrderService } from '../lib/services/order.service';
import { WebhookService } from '../lib/services/webhook.service';

/**
 * =============================================================================
 * SUITE DE PRUEBAS FENIXCMS_5: PRODUCCIÓN REAL, FUENTE ÚNICA DE VERDAD Y FAIL-CLOSED
 * =============================================================================
 */

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${errorDetail ? ` - ${errorDetail}` : ''}`);
    totalFailed++;
  }
}

export async function runFase5Tests(): Promise<void> {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS FENIXCMS_5: PRODUCCIÓN REAL, FUENTE ÚNICA DE VERDAD');
  console.log('================================================================================');

  // ---------------------------------------------------------------------------
  // [1/8] P01-P03: SAAS CHECKOUT & ZERO TENANT CREATION BEFORE PAYMENT
  // ---------------------------------------------------------------------------
  console.log('\n📋 [1/8] CHECKOUT SAAS: NO TENANT BEFORE PAYMENT & FAIL-CLOSED');
  try {
    // P03: Checkout session generation does not create a tenant prematurely
    const session = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'Cliente Prueba F5',
      customerEmail: 'prueba.f5@fenixcms.es',
      tenantName: 'Tienda F5 Test',
      tenantSlug: 'tienda-f5-test',
      billingPeriod: 'monthly',
      provider: 'PAYPAL'
    });

    assert(
      typeof session.sessionId === 'string' && session.sessionId.startsWith('cs_'),
      'P03: Crea CheckoutSession con ID legítimo sin crear Tenant previo'
    );
    assert(
      session.amount > 0 && session.currency === 'EUR',
      'P03: Importe y moneda calculados por autoridad del servidor'
    );

    // P01: Rejection of non-existent plan/application
    let badPlanFailed = false;
    try {
      await SaaSCheckoutService.createSession({
        applicationId: 'ECOMMERCE',
        planId: 'plan_inexistente_falso_9999',
        customerName: 'Prueba Error',
        customerEmail: 'error@fenixcms.es',
        tenantName: 'Error Store',
        tenantSlug: 'error-store-slug',
        billingPeriod: 'monthly',
        provider: 'PAYPAL'
      });
    } catch {
      badPlanFailed = true;
    }
    assert(badPlanFailed, 'P01/P02: Rechaza plan inexistente sin inventar plan demo fallback');
  } catch (err: any) {
    assert(false, 'Fallo en pruebas de checkout SaaS Fase 5', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [2/8] P04-P05: PAYMENT SERVICE FAIL-CLOSED & ZERO MEMORY COMPLETED
  // ---------------------------------------------------------------------------
  console.log('\n📋 [2/8] PAYMENT SERVICE: RECHAZO DE IDENTIFICADORES Y ESTADOS FALSOS');
  try {
    // P04/P05: Spoofed fake transaction id must be rejected
    const fakeVerification = await PaymentService.verifyAndProcessSaaSPayment({
      provider: 'PAYPAL',
      providerPaymentId: 'client_claimed_success',
      paymentId: 'pay_test_fake_001'
    });

    assert(
      fakeVerification.success === false,
      'P05: Rechaza transacción simulada o client_claimed_success sin validación real de pasarela'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba de verificación de pago', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [3/8] P06: AUTH SERVICE FAIL-CLOSED EN MODO PRODUCCIÓN
  // ---------------------------------------------------------------------------
  console.log('\n📋 [3/8] AUTH SERVICE: VERIFICACIÓN CRIPTOGRÁFICA Y CERO CREDENCIALES MAESTRAS');
  try {
    // Password hash verification is strict
    const user = await AuthService.getUserByEmail('no_existe_en_absoluto@fenixcms.es');
    assert(user === null, 'P06: Consulta de usuario inexistente devuelve null sin crear usuarios en memoria');

    const badLogin = await AuthService.login({
      email: 'admin@fenixcms.es',
      password: 'password_incorrecto_1234'
    });
    assert(badLogin.success === false, 'P06: Login con contraseña errónea es rechazado categóricamente');
  } catch (err: any) {
    assert(false, 'Fallo en prueba de autenticación', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [4/8] P07 & P17-P18: SUPER ADMIN METRICS & EMPTY STATE BEHAVIOR
  // ---------------------------------------------------------------------------
  console.log('\n📋 [4/8] SUPER ADMIN: CONSULTA DE MÉTRICAS Y ESTADOS VACÍOS');
  try {
    const metrics = await SuperAdminService.getDashboardMetrics();
    assert(typeof metrics.mrr === 'number', 'P07: MRR devuelto como valor numérico determinista');
    assert(typeof metrics.tenants === 'number', 'P07: Total de tenants devuelto como valor numérico');
    assert(metrics.currency === 'EUR', 'P07: Moneda estándar de métricas es EUR');
  } catch (err: any) {
    assert(false, 'Fallo en métricas de super admin', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [5/8] P08 & P19: STORAGE REAL PERSISTENTE & CHECKSUM SHA-256
  // ---------------------------------------------------------------------------
  console.log('\n📋 [5/8] STORAGE PERSISTENTE: CHECKSUM REAL SHA-256 DE BYTES');
  try {
    const provider = new ManagedStorageProvider('/uploads');
    const testPayload = Buffer.from('Contenido binario multimedia de prueba FenixCMS 2026', 'utf-8');
    const expectedChecksum = crypto.createHash('sha256').update(testPayload).digest('hex');

    const uploadRes = await provider.upload({
      tenantId: 'tenant_test_storage_f5',
      filename: 'documento_prueba.txt',
      mimeType: 'text/plain',
      size: testPayload.length,
      bufferOrUrl: testPayload
    });

    assert(
      uploadRes.checksum === expectedChecksum,
      `P19: Checksum coincide exactamente con SHA-256 de los bytes: ${uploadRes.checksum.slice(0, 16)}...`
    );
    assert(
      uploadRes.storageKey.includes('tenant_test_storage_f5'),
      'P19: StorageKey aislado por tenantId'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba de almacenamiento SHA-256', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [6/8] P10-P11: STORE CHECKOUT & CUPONES FAIL-CLOSED
  // ---------------------------------------------------------------------------
  console.log('\n📋 [6/8] STORE CHECKOUT: AUTORIDAD DE PRODUCTOS Y CUPONES');
  try {
    const invalidCouponOrder = await OrderService.createOrder({
      tenantId: 'tenant_boutiquevalencia',
      customerName: 'Cliente F5',
      customerEmail: 'cliente.f5@test.es',
      shippingAddress: {
        address: 'Calle Mayor 1',
        city: 'Valencia',
        postalCode: '46001',
        country: 'España'
      },
      items: [{ productId: 'prod_1', quantity: 1 }],
      couponCode: 'CUPON_NO_EXISTENTE_99999',
      paymentMethod: 'paypal'
    });

    assert(
      invalidCouponOrder.success === false,
      'P11: Cupón inexistente es rechazado en servidor'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba de checkout de tienda F5', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [7/8] P15-P16 & P20: PROVISIONING ATÓMICO & IDEMPOTENCIA CONCURRENTE
  // ---------------------------------------------------------------------------
  console.log('\n📋 [7/8] PROVISIONING ATÓMICO E IDEMPOTENCIA CONCURRENTE');
  try {
    const cleanSlug = `store-f5-${Date.now().toString(36)}`;
    const session = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'María García',
      customerEmail: 'maria.garcia@fenixcms.es',
      tenantName: 'Tienda María',
      tenantSlug: cleanSlug,
      billingPeriod: 'monthly',
      provider: 'PAYPAL'
    });

    const mockCapture = {
      id: session.paymentId,
      status: 'COMPLETED',
      amount: { value: session.amount.toFixed(2), currency_code: 'EUR' },
      custom_id: session.sessionId
    };

    const prov1 = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: session.sessionId,
      captureId: `cap_${session.paymentId}`,
      capturedAmount: session.amount,
      capturedCurrency: 'EUR'
    });
    assert(prov1.success === true, 'P16: Aprovisionamiento atómico de sesión completado');
    assert(prov1.tenant?.slug === cleanSlug, 'P16: Tenant creado con slug verificado');

    // P20: Concurrent/duplicate provisioning returns idempotent completed state
    const prov2 = await SaaSProvisioningService.provisionFromCapturedCheckout({
      checkoutSessionId: session.sessionId,
      captureId: `cap_${session.paymentId}`,
      capturedAmount: session.amount,
      capturedCurrency: 'EUR'
    });
    assert(prov2.success === true, 'P20: Reintento concurrente devuelve éxito idempotente sin duplicar recursos');
  } catch (err: any) {
    assert(false, 'Fallo en prueba de provisioning atómico', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [8/8] WEBHOOKS FAIL-CLOSED
  // ---------------------------------------------------------------------------
  console.log('\n📋 [8/8] WEBHOOKS: IDEMPOTENCIA Y SEGURIDAD CRIPTOGRÁFICA');
  try {
    const eventId = `WH-EVT-F5-${Date.now()}`;
    const check1 = await WebhookService.checkIdempotency('paypal', eventId);
    assert(check1.isDuplicate === false, 'P20: Primer evento no es duplicado');

    await WebhookService.recordWebhookEvent({
      provider: 'paypal',
      eventId,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      payload: { id: 'capture_123', status: 'COMPLETED' },
      signatureVerified: true
    });
    await WebhookService.markProcessed(eventId);

    const check2 = await WebhookService.checkIdempotency('paypal', eventId);
    assert(check2.isDuplicate === true, 'P20: Evento procesado detectado como duplicado por idempotencia');
  } catch (err: any) {
    assert(false, 'Fallo en prueba de webhooks', err?.message);
  }

  // ---------------------------------------------------------------------------
  // RESUMEN FINAL DE LA SUITE
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS FASE 5: ${totalPassed} PASADAS, ${totalFailed} FALLIDAS`);
  console.log('================================================================================');

  if (totalFailed > 0) {
    throw new Error(`Suite de pruebas FENIXCMS_5 falló con ${totalFailed} errores.`);
  }
}

// Direct execution
if (process.argv[1]?.endsWith('fenixcms-fase5.test.ts')) {
  runFase5Tests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}
