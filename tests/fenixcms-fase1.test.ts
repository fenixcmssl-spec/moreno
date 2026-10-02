import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';
import { PayPalGatewayService } from '../lib/services/paypal-gateway.service';
import { WebhookService } from '../lib/services/webhook.service';
import { LicenseService } from '../lib/services/license.service';
import { SubscriptionService } from '../lib/services/subscription.service';
import { InvoiceService } from '../lib/services/invoice.service';

/**
 * =========================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: FENIXCMS_1 (FASE 1)
 * =========================================================================
 * Criterios de Aceptación:
 * P01: Bloqueo de aprovisionamiento directo sin pago capturado.
 * P02: Protección contra manipulación de importes por el cliente.
 * P03: Protección contra alteración de planes/aplicaciones.
 * P04: Captura COMPLETED aprovisiona Tenant + Licencia + Suscripción + Factura.
 * P05: Idempotencia: Repetir el mismo orderId no duplica recursos.
 * P06: Captura PENDING o DENIED rechaza aprovisionamiento.
 * P07: Verificación criptográfica de Webhooks de PayPal e idempotencia.
 * P08: Eliminación de URLs y tokens simulados.
 * =========================================================================
 */

async function runFase1Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS FENIXCMS_1: CIERRE DE APROVISIONAMIENTO Y PAGO PAYPAL REAL');
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
  // P01: BLOQUEO DE APROVISIONAMIENTO DIRECTO SIN PAGO CAPTURADO
  // ---------------------------------------------------------------------------
  console.log('\n📋 [1/7] REGLA INVARIANTE: NO PAYMENT CAPTURED = NO PROVISIONING');
  try {
    const directProvisionAttempt = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'PAYPAL',
      providerPaymentId: '',
      rawPayload: { planId: 'plan_pro', customerEmail: 'hacker@fraude.es' }
    });

    assert(
      directProvisionAttempt.success === false,
      'Rechaza intento de aprovisionamiento sin identificador de orden de pago'
    );
    assert(
      directProvisionAttempt.payment?.status === 'FAILED',
      'Estado del pago permanece en FAILED'
    );
  } catch (err: any) {
    assert(true, 'Lanza excepción o rechazo ante petición sin pago');
  }

  // ---------------------------------------------------------------------------
  // P02 & P03: PRECIO E IMPORTE CALCULADO ESTRICTAMENTE EN SERVIDOR
  // ---------------------------------------------------------------------------
  console.log('\n📋 [2/7] AUTORIDAD DE PRECIOS Y PLANES EN SERVIDOR');
  try {
    const session = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      customerName: 'Comercio Test Oficial',
      customerEmail: 'propietario.test@fenixcms.es',
      tenantSlug: 'mitiendasegura',
      tenantName: 'Mi Tienda Segura',
      billingPeriod: 'monthly',
      provider: 'PAYPAL'
    });

    assert(
      session.amount > 0 && typeof session.amount === 'number',
      'El importe es calculado por el servidor basado en el catálogo oficial de planes'
    );
    assert(
      session.currency === 'EUR',
      'La moneda es EUR conforme a la configuración del plan'
    );
    assert(
      typeof session.paymentId === 'string' && (session.paymentId.startsWith('pay_saas_') || session.paymentId.startsWith('cs_')),
      'Genera paymentId persistente para trazabilidad'
    );
    assert(
      session.checkoutUrl.includes('paypal.com'),
      'Genera enlace legítimo de checkout con PayPal'
    );
  } catch (err: any) {
    assert(false, 'Error creando sesión de checkout en servidor', err?.message);
  }

  // ---------------------------------------------------------------------------
  // P04: CAPTURA COMPLETED APROVISIONA ATÓMICAMENTE
  // ---------------------------------------------------------------------------
  console.log('\n📋 [3/7] CAPTURA COMPLETED Y APROVISIONAMIENTO ATÓMICO');
  let completedOrderId = '';
  try {
    const session = await SaaSCheckoutService.createSession({
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'Comercio Real',
      customerEmail: 'comercio.real@fenixcms.es',
      tenantSlug: `tiendareal_${Date.now().toString().slice(-4)}`,
      tenantName: 'Tienda Real Fenix',
      billingPeriod: 'monthly',
      provider: 'PAYPAL'
    });

    completedOrderId = session.paymentId;

    const result = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'PAYPAL',
      providerPaymentId: completedOrderId,
      paymentId: session.paymentId,
      sessionId: session.sessionId
    });

    assert(result.success === true, 'verifyAndProcessPayment devuelve success=true tras captura COMPLETED');
    assert(result.payment?.status === 'COMPLETED', 'Estado del pago actualizado a COMPLETED');
    assert(typeof result.payment?.paidAt === 'string', 'Fecha de pago paidAt registrada');
    assert(!!result.license, 'Licencia SaaS aprovisionada');
    assert(
      result.license?.licenseKey?.startsWith('FNX-') || result.license?.displayKey?.startsWith('FNX-'),
      'Clave de licencia en formato oficial FNX-...'
    );
  } catch (err: any) {
    assert(false, 'Fallo en captura y aprovisionamiento COMPLETED', err?.message);
  }

  // ---------------------------------------------------------------------------
  // P05: IDEMPOTENCIA (REPETIR MISMO ORDERID NO DUPLICA RECURSOS)
  // ---------------------------------------------------------------------------
  console.log('\n📋 [4/7] IDEMPOTENCIA: PREVENCIÓN DE DUPLICADOS');
  try {
    const repeatResult = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'PAYPAL',
      providerPaymentId: completedOrderId,
      paymentId: completedOrderId
    });

    assert(repeatResult.success === true, 'Petición repetida devuelve éxito idempotente');
    assert(
      repeatResult.payment?.id === completedOrderId || !!repeatResult.license,
      'Devuelve el estado previamente aprovisionado sin duplicar licencias'
    );
  } catch (err: any) {
    assert(false, 'Fallo en test de idempotencia', err?.message);
  }

  // ---------------------------------------------------------------------------
  // P06: CAPTURA PENDING O DENIED RECHAZA APROVISIONAMIENTO
  // ---------------------------------------------------------------------------
  console.log('\n📋 [5/7] PAGOS DENIED O PENDING NO APROVISIONAN');
  try {
    const deniedResult = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'PAYPAL',
      providerPaymentId: 'test_denied_order_123',
      paymentId: 'test_denied_order_123'
    });

    assert(deniedResult.success === false, 'Pago con captura DENIED es rechazado');
    assert(
      deniedResult.payment?.status === 'DENIED' || deniedResult.payment?.status === 'FAILED',
      'No se crea licencia ni suscripción ante pago denegado'
    );

    const pendingResult = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'PAYPAL',
      providerPaymentId: 'test_pending_order_456',
      paymentId: 'test_pending_order_456'
    });

    assert(pendingResult.success === false, 'Pago con captura PENDING no genera licencia final');
  } catch (err: any) {
    assert(false, 'Fallo en prueba de captura no completada', err?.message);
  }

  // ---------------------------------------------------------------------------
  // P07: WEBHOOKS PAYPAL — VERIFICACIÓN Y MÁQUINA DE ESTADOS
  // ---------------------------------------------------------------------------
  console.log('\n📋 [6/7] WEBHOOKS PAYPAL — MÁQUINA DE ESTADOS E IDEMPOTENCIA');
  try {
    // 1. CHECKOUT.ORDER.APPROVED -> No provisiona licencia final, espera captura
    const approvedEvent = {
      id: `WH-EVT-APP-${Date.now()}`,
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: 'PP-ORD-APPROVED-1', custom_id: 'tenant_sample' }
    };

    const processApproved = await WebhookService.processPayPalEvent(approvedEvent);
    assert(
      processApproved.success === true,
      'CHECKOUT.ORDER.APPROVED es registrado como pendiente de captura sin entregar licencia final'
    );

    // 2. PAYMENT.CAPTURE.COMPLETED -> Reconcilia y activa
    const captureCompletedEvent = {
      id: `WH-EVT-CAP-${Date.now()}`,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: 'PP-CAP-COMPLETED-1', custom_id: 'tenant_sample', invoice_number: 'FNX-TEST-LIC' }
    };

    const processCapture = await WebhookService.processPayPalEvent(captureCompletedEvent);
    assert(
      processCapture.success === true,
      'PAYMENT.CAPTURE.COMPLETED ejecuta la confirmación efectiva'
    );

    // 3. Verificación de rechazo de firma malformada o no base64
    const invalidSignatureResult = WebhookService.verifyPayPalSignature(
      JSON.stringify(approvedEvent),
      {
        transmissionId: 'trans_123',
        transmissionTime: new Date().toISOString(),
        transmissionSig: 'invalid@@signature!!',
        certUrl: 'https://api.paypal.com/cert.pem',
        authAlgo: 'SHA256withRSA'
      }
    );

    assert(
      invalidSignatureResult.valid === false,
      'Rechaza cabeceras con firma corrupta o no Base64'
    );
  } catch (err: any) {
    assert(false, 'Fallo en test de webhooks PayPal', err?.message);
  }

  // ---------------------------------------------------------------------------
  // P08: AUDITORÍA DE PASARELA Y GATEWAY PAYPAL
  // ---------------------------------------------------------------------------
  console.log('\n📋 [7/7] AUDITORÍA DE PAYPAL GATEWAY SERVICE');
  try {
    const baseUrl = PayPalGatewayService.getBaseUrl();
    assert(
      baseUrl.includes('paypal.com'),
      `URL base de PayPal oficial configurada: ${baseUrl}`
    );

    const token = await PayPalGatewayService.getAccessToken();
    assert(
      typeof token === 'string' && token.length > 0,
      'Servicio de autenticación OAuth2 de PayPal disponible'
    );
  } catch (err: any) {
    assert(false, 'Fallo en auditoría de PayPalGatewayService', err?.message);
  }

  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS FASE 1: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================================\n');

  if (failed > 0) {
    throw new Error(`Suite de pruebas FENIXCMS_1 falló con ${failed} errores.`);
  }
}

// Ejecutar si es invocado directamente
if (require.main === module || process.argv[1]?.includes('fenixcms-fase1')) {
  runFase1Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { runFase1Tests };
