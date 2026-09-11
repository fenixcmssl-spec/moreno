import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';
import { StorefrontCheckoutService } from '../lib/services/storefront-checkout.service';
import { PaymentService } from '../lib/services/payment.service';
import { LicenseService } from '../lib/services/license.service';
import { SubscriptionService } from '../lib/services/subscription.service';
import { InvoiceService } from '../lib/services/invoice.service';

async function runTwoCommercesSeparationTests() {
  console.log('===================================================================');
  console.log('🧪 PASO 13: TEST SUITE — SEPARACIÓN ABSOLUTA DE LOS DOS COMERCIOS');
  console.log('   PORTAL FENIXCMS (SaaS Commerce) vs STOREFRONT TENANT (E-Commerce)');
  console.log('===================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // =========================================================================
  // SUITE 1: PORTAL FENIXCMS COMMERCE (SaaS Engine)
  // Sells: Applications, Plans, Subscriptions, Licenses, Invoices
  // Rule: MUST NOT create Product or Order entities for the tenant.
  // =========================================================================
  console.log('--- 1. PORTAL FENIXCMS COMMERCE (SaaSCheckoutService) ---');

  // 1.1 List Applications and Plans
  const apps = SaaSCheckoutService.getApplications();
  assert(apps.length >= 8, `Portal FenixCMS tiene catálogo de ${apps.length} aplicaciones especializadas`);
  const ecommerceApp = apps.find(a => a.id === 'app_ecommerce');
  assert(ecommerceApp !== undefined && ecommerceApp.modules.length >= 4, 'Aplicación E-commerce cuenta con módulos definidos');

  const plans = SaaSCheckoutService.getPlans('app_ecommerce');
  assert(plans.length >= 3, `Aplicación E-commerce cuenta con ${plans.length} planes de precios (Starter, Pro, Enterprise)`);

  // 1.2 Initialize SaaS Checkout Session
  const saasSession = await SaaSCheckoutService.createSession({
    applicationId: 'app_ecommerce',
    planId: 'plan_pro',
    tenantSlug: 'boutiquevalencia',
    tenantName: 'Boutique Valencia S.L.',
    customerName: 'Carlos M.',
    customerEmail: 'carlos@boutiquevalencia.es',
    billingPeriod: 'yearly',
    provider: 'STRIPE',
    billingAddress: {
      address: 'Calle Colón 15',
      city: 'Valencia',
      postalCode: '46004',
      country: 'España',
      taxId: 'B-98765432'
    }
  });

  assert(saasSession.sessionId.startsWith('cs_saas_stripe_'), 'Genera sessionId exclusivo de SaaS (cs_saas_stripe_...)');
  assert(saasSession.amount === 790, `Calcula importe anual con descuento correctamente (790€)`);
  assert(saasSession.currency === 'EUR', 'Moneda establecida en EUR');
  assert(saasSession.clientSecret !== undefined, 'Entrega clientSecret para Stripe Elements seguro');

  // 1.3 Verify and Complete SaaS Purchase
  const saasCompletion = await SaaSCheckoutService.verifyAndProcessPayment({
    provider: 'STRIPE',
    providerPaymentId: 'pi_test_stripe_verified_998877',
    sessionId: saasSession.sessionId,
    paymentId: saasSession.paymentId,
    rawPayload: {
      customer_email: 'carlos@boutiquevalencia.es',
      customer_name: 'Carlos M.'
    }
  });

  assert(saasCompletion.success === true, 'SaaSCheckoutService verifica pago exitoso');
  assert(saasCompletion.payment.status === 'COMPLETED', 'SaaS Payment registrado con estado COMPLETED');
  assert(saasCompletion.subscription !== undefined, 'Suscripción SaaS aprovisionada para el tenant');
  assert(saasCompletion.license !== undefined, 'Licencia SaaS generada con clave');
  assert(
    typeof saasCompletion.license.displayKey === 'string' && saasCompletion.license.displayKey.startsWith('FNX-'),
    `Clave de licencia con formato oficial: ${saasCompletion.license.displayKey}`
  );
  assert(saasCompletion.invoice !== undefined, 'Factura SaaS B2B generada');
  assert(
    typeof saasCompletion.invoice.invoiceNumber === 'string' && saasCompletion.invoice.invoiceNumber.startsWith('FNX-'),
    `Factura SaaS con numeración oficial: ${saasCompletion.invoice.invoiceNumber}`
  );

  // 1.4 Architectural assertion: Confirm ZERO tenant Orders or Products created in SaaS flow
  const tenantOrdersAfterSaaS = await StorefrontCheckoutService.getOrdersByTenant('tenant_boutiquevalencia');
  assert(
    tenantOrdersAfterSaaS.length === 0,
    'REGLA CUMPLIDA: La compra de licencia FenixCMS no creó ningún Product ni Order de tienda para el tenant'
  );

  // =========================================================================
  // SUITE 2: STOREFRONT TENANT COMMERCE (StorefrontCheckoutService)
  // Sells: Products, Cart, Coupons, Shipping, Orders, Customers
  // Rule: MUST NOT create License, Subscription, Plan or SaaS Payments.
  // =========================================================================
  console.log('\n--- 2. STOREFRONT TENANT COMMERCE (StorefrontCheckoutService) ---');

  // 2.1 Calculate Storefront Totals
  const storeCartItems = [
    { productId: 'prod_1', title: 'Smartphone Pro 5G Max', price: 899.99, quantity: 1, sku: 'PHN-5G-01' },
    { productId: 'prod_2', title: 'Funda Protectora Silicona', price: 19.99, quantity: 2, sku: 'ACC-CSE-02' }
  ];

  const storeTotals = StorefrontCheckoutService.calculateTotals({
    items: storeCartItems,
    couponCode: 'FENIX10',
    shippingMethod: 'correos_express',
    taxRate: 0.21
  });

  assert(storeTotals.subtotal === 939.97, `Subtotal de productos calculado correctamente (939.97€)`);
  assert(storeTotals.discount === 94.0, `Descuento de cupón 10% aplicado correctamente (-94.00€)`);
  assert(storeTotals.shippingCost === 0, 'Envío gratuito por superar el umbral de 50€');
  assert(storeTotals.taxAmount === 177.65, `IVA 21% calculado sobre base imponible descontada (177.65€)`);
  assert(storeTotals.total === 1023.62, `Total del pedido del comprador: 1023.62€`);

  // 2.2 Process Storefront Order
  const storefrontOrderResult = await StorefrontCheckoutService.createStorefrontOrder({
    tenantId: 'tenant_boutiquevalencia',
    customerName: 'Ana Belén Martínez',
    customerEmail: 'anabelen@cliente.com',
    customerPhone: '+34 600 112 233',
    shippingAddress: {
      address: 'Calle Mayor 4, 2ºA',
      city: 'Valencia',
      state: 'Valencia',
      postalCode: '46002',
      country: 'España'
    },
    items: storeCartItems,
    paymentMethod: 'stripe',
    shippingMethod: 'correos_express',
    couponCode: 'FENIX10'
  });

  assert(storefrontOrderResult.success === true, 'StorefrontCheckoutService crea el pedido con éxito');
  const order = storefrontOrderResult.order;
  assert(order.orderNumber.startsWith('FNX-'), `Número de pedido generado para el comprador: ${order.orderNumber}`);
  assert(order.paymentStatus === 'paid', 'Estado de pago del pedido marcado como paid');
  assert(order.trackingNumber.startsWith('CE'), `Localizador de transporte Correos Express asignado: ${order.trackingNumber}`);
  assert(order.items.length === 2, 'El pedido contiene exactamente los 2 items del carrito');

  // 2.3 Verify Storefront Order retrieval isolated by tenant
  const tenantOrders = await StorefrontCheckoutService.getOrdersByTenant('tenant_boutiquevalencia');
  assert(tenantOrders.length >= 1, `Pedidos de la tienda recuperados para boutiquevalencia: ${tenantOrders.length}`);
  const foundOrder = await StorefrontCheckoutService.getOrderById(order.orderNumber, 'tenant_boutiquevalencia');
  assert(foundOrder !== undefined && foundOrder.customerEmail === 'anabelen@cliente.com', 'Pedido del comprador recuperado íntegro por orderNumber');

  // =========================================================================
  // SUITE 3: ABSOLUTE LOGICAL SEPARATION & BOUNDARY TESTS
  // =========================================================================
  console.log('\n--- 3. ABSOLUTE LOGICAL SEPARATION & INTEGRITY TESTS ---');

  // 3.1 Storefront Order does NOT touch SaaS Subscriptions
  const saasPayments = await SaaSCheckoutService.getPayments('tenant_boutiquevalencia');
  assert(
    saasPayments.every((p: any) => p.paymentType === 'SAAS_LICENSE' || p.paymentType === 'SAAS_SUBSCRIPTION'),
    'El ledger de pagos SaaS contiene únicamente cobros de licencias/suscripciones FenixCMS (cero pedidos de tienda)'
  );

  // 3.2 Fraud resistance: Storefront customer cannot claim SaaS License
  const fraudAttempt = await SaaSCheckoutService.verifyAndProcessPayment({
    provider: 'STRIPE',
    providerPaymentId: 'mock_invalid_fraud_attempt',
    sessionId: 'invalid_session'
  });
  assert(fraudAttempt.success === false, 'Intento de activar licencia con pago fraudulento es rechazado');

  // 3.3 Multi-tenant isolation: Boutique Valencia orders not visible to other stores
  const otherTenantOrders = await StorefrontCheckoutService.getOrdersByTenant('tenant_tienda_madrid');
  assert(
    !otherTenantOrders.some((o: any) => o.id === order.id || o.orderNumber === order.orderNumber),
    'Aislamiento Multi-Tenant: Los pedidos de boutiquevalencia no son accesibles por otra tienda'
  );

  console.log('\n===================================================================');
  console.log(`📊 RESULTADOS FINALES: ${passed} PASADOS, ${failed} FALLIDOS`);
  console.log('===================================================================');

  if (failed > 0) {
    throw new Error(`Se encontraron ${failed} fallos en el test de separación de comercios.`);
  }
}

runTwoCommercesSeparationTests()
  .then(() => {
    console.log('🎉 Todos los tests de separación de comercios pasaron exitosamente.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error ejecutando suite de tests:', err);
    process.exit(1);
  });
