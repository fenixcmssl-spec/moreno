import crypto from 'crypto';
import { PaymentService } from '../lib/services/payment.service';
import { InvoiceService } from '../lib/services/invoice.service';
import { LicenseService } from '../lib/services/license.service';
import { SubscriptionService } from '../lib/services/subscription.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runPaymentInvoicingTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DE PASO 11 — PAYMENT + INVOICING');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // Test Suite 1: Separación de Pagos SaaS vs Storefront
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Separación de Pagos SaaS vs Storefront ---');
  
  // Storefront calculation (customer buying items in store)
  const storeTotals = PaymentService.calculateStoreTotals({
    items: [
      { price: 25.00, quantity: 2 }, // 50
      { price: 15.00, quantity: 1 }  // 15 = 65
    ],
    couponDiscountPct: 10, // 6.50 -> 58.50
    shippingMethod: 'correos_express', // taxable > 50 -> 0
    taxRate: 0.21
  });

  assert(storeTotals.subtotal === 65, 'Subtotal de tienda debe ser 65€');
  assert(storeTotals.discount === 6.5, 'Descuento de cupón debe ser 6.50€');
  assert(storeTotals.taxRate === 0.21, 'Tasa de IVA debe ser 21%');
  assert(storeTotals.shippingCost === 0, 'Envío gratuito para pedidos mayores a 50€');
  assert(storeTotals.total > 70, `Total con IVA calculado correctamente: ${storeTotals.total}€`);

  // -------------------------------------------------------------------------
  // Test Suite 2: Flujo FenixCMS SaaS Checkout & Anti-Fraude
  // Application -> Plan -> Checkout -> Payment
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: SaaS Checkout & Prevención de Pagos Falsos ---');

  const checkoutSession = await PaymentService.createSaaSCheckoutSession({
    applicationId: 'app_ecommerce',
    planId: 'plan_pro',
    tenantSlug: 'modas-granvia',
    tenantName: 'Modas Gran Vía',
    customerName: 'Lucía Gómez',
    customerEmail: 'lucia@granvia.es',
    billingPeriod: 'monthly',
    provider: 'STRIPE'
  });

  assert(Boolean(checkoutSession.sessionId), 'Debe generar un sessionId único');
  assert(Boolean(checkoutSession.paymentId), 'Debe registrar un paymentId inicial');
  assert(checkoutSession.amount > 0, `Monto del plan Pro debe ser positivo (${checkoutSession.amount}€)`);
  assert(checkoutSession.provider === 'STRIPE', 'Proveedor debe ser STRIPE');
  assert(Boolean(checkoutSession.clientSecret), 'Debe devolver clientSecret para la pasarela');

  // Attempt to claim false success with fake token / client assertion
  const fakeVerification = await PaymentService.verifyAndProcessSaaSPayment({
    provider: 'STRIPE',
    providerPaymentId: 'client_claimed_success',
    paymentId: checkoutSession.paymentId,
    sessionId: checkoutSession.sessionId
  });

  assert(fakeVerification.success === false, 'Debe RECHAZAR pago con token fraudulento o afirmación de cliente sin verificar');
  assert(Boolean(fakeVerification.error), 'Debe devolver mensaje descriptivo del rechazo de seguridad');

  // -------------------------------------------------------------------------
  // Test Suite 3: Verificación Real y Aprovisionamiento SaaS Completo
  // Payment -> Subscription -> License -> Invoice
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Flujo Completo SaaS (Payment -> Sub -> Lic -> Invoice) ---');

  const verifiedPaymentId = `pi_stripe_verified_${Date.now()}`;
  const completionResult = await PaymentService.verifyAndProcessSaaSPayment({
    provider: 'STRIPE',
    providerPaymentId: verifiedPaymentId,
    paymentId: checkoutSession.paymentId,
    sessionId: checkoutSession.sessionId
  });

  assert(completionResult.success === true, 'Procesamiento de pago verificado debe ser exitoso');
  
  // Payment verification
  const payment = completionResult.payment;
  assert(payment.id === checkoutSession.paymentId, 'ID de pago debe coincidir con la sesión');
  assert(payment.status === 'COMPLETED', 'Estado del pago debe actualizarse a COMPLETED');
  assert(payment.providerPaymentId === verifiedPaymentId, 'Debe registrar el providerPaymentId verificado');
  assert(Boolean(payment.paidAt), 'paidAt debe tener timestamp');

  // Subscription verification
  const subscription = completionResult.subscription;
  assert(Boolean(subscription), 'Debe crear y enlazar la suscripción');
  assert(subscription.status === 'ACTIVE', 'Suscripción debe estar en estado ACTIVE');
  assert(subscription.tenantId === checkoutSession.tenantId, 'Suscripción debe pertenecer al tenant');

  // License verification
  const license = completionResult.license;
  assert(Boolean(license), 'Debe emitir la licencia para el comercio');
  assert(license.status === 'active', 'Licencia debe estar en estado active');
  assert(license.licenseKey.startsWith('FNX-'), 'Clave de licencia debe tener formato FNX-');
  assert(license.tenantId === checkoutSession.tenantId, 'Licencia debe pertenecer al tenant');

  // Invoice verification
  const invoice = completionResult.invoice;
  assert(Boolean(invoice), 'Debe generar la factura oficial');
  assert(invoice.status === 'PAID', 'Estado de la factura debe ser PAID');
  assert(invoice.invoiceNumber.startsWith('FNX-'), 'Número de factura debe tener prefijo FNX-');
  assert(invoice.amount === checkoutSession.amount, 'Total de la factura debe coincidir con el monto pagado');

  // -------------------------------------------------------------------------
  // Test Suite 4: Persistencia y Gestión de Invoices
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Persistencia y Gestión de Invoices ---');

  const tenantInvoices = await InvoiceService.getInvoices({ tenantId: checkoutSession.tenantId });
  assert(tenantInvoices.length >= 1, 'Debe recuperar las facturas emitidas para el tenant');
  assert(tenantInvoices[0].tenantId === checkoutSession.tenantId, 'Factura recuperada pertenece al tenant');

  const retrievedInvoice = await InvoiceService.getInvoiceById(invoice.id);
  assert(retrievedInvoice !== null, 'Debe recuperar la factura por ID');
  assert(retrievedInvoice?.invoiceNumber === invoice.invoiceNumber, 'Número correlativo debe coincidir');

  // -------------------------------------------------------------------------
  // Test Suite 5: Webhook Seguro con Verificación e Idempotencia
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Webhooks Seguros con Idempotencia ---');

  // Create another checkout for webhook test
  const webhookCheckout = await PaymentService.createSaaSCheckoutSession({
    applicationId: 'app_ecommerce',
    planId: 'plan_starter',
    tenantSlug: 'zapateria-valencia',
    tenantName: 'Zapatería Valencia',
    customerName: 'Carlos Ruiz',
    customerEmail: 'carlos@zapateria.es',
    billingPeriod: 'monthly',
    provider: 'STRIPE'
  });

  const webhookEventId = `evt_test_${Date.now()}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const webhookPayload = {
    id: webhookEventId,
    event_type: 'payment_intent.succeeded',
    providerPaymentId: `pi_webhook_verified_${Date.now()}`,
    paymentId: webhookCheckout.paymentId,
    status: 'COMPLETED'
  };
  const rawPayloadString = JSON.stringify(webhookPayload);
  const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_fenix_stripe_webhook_prod_default';
  const validHash = crypto.createHmac('sha256', secret).update(`${nowSec}.${rawPayloadString}`, 'utf8').digest('hex');
  const stripeSig = `t=${nowSec},v1=${validHash}`;

  const webhookResult1 = await PaymentService.handleSaaSWebhook({
    provider: 'STRIPE',
    eventId: webhookEventId,
    signature: stripeSig,
    payload: webhookPayload
  });

  assert(webhookResult1.success === true, 'Primer procesamiento del webhook debe ser exitoso');

  // Repeated webhook with same eventId (Idempotency test)
  const webhookResult2 = await PaymentService.handleSaaSWebhook({
    provider: 'STRIPE',
    eventId: webhookEventId,
    signature: stripeSig,
    payload: webhookPayload
  });

  assert(webhookResult2.success === true, 'Llamada idempotente al webhook debe responder éxito sin duplicar');
  assert(webhookResult2.message.includes('idempotente') || webhookResult2.message.includes('registrado'), 'Mensaje debe confirmar idempotencia');

  // Invalid signature webhook test
  const invalidSigResult = await PaymentService.handleSaaSWebhook({
    provider: 'STRIPE',
    eventId: `evt_invalid_${Date.now()}`,
    signature: 'invalid_signature_mock',
    payload: { status: 'COMPLETED' }
  });

  assert(invalidSigResult.success === false, 'Debe RECHAZAR webhook con firma inválida');

  console.log('\n====================================================');
  console.log('🏁 RESULTADO PASO 11: TODAS LAS PRUEBAS PASADAS CON ÉXITO');
  console.log('====================================================');
}

runPaymentInvoicingTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
