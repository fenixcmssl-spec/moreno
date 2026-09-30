import prisma from '../lib/prisma';
import { OrderService } from '../lib/services/order.service';
import { StorefrontCheckoutService } from '../lib/services/storefront-checkout.service';
import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';

async function runSecureStorefrontCheckoutTests() {
  console.log('===================================================================');
  console.log('🧪 FASE 20-D.9: TEST SUITE — CHECKOUT SEGURO Y SEPARACIÓN COMERCIAL');
  console.log('   POSTGRESQL ZERO-TRUST VERIFICATION & COMPLETE ISOLATION');
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

  const testTenantAId = 'tenant_checkout_a';
  const testTenantBId = 'tenant_checkout_b';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Seed test tenants, products, and coupons in PostgreSQL
    // -------------------------------------------------------------------------
    console.log('--- 0. SETUP DE ENTORNO EN POSTGRESQL ---');
    
    // Create/Upsert Test Tenant A
    await (prisma as any).tenant.upsert({
      where: { id: testTenantAId },
      update: { status: 'active', name: 'Tienda Moda Alfa', currency: 'EUR' },
      create: {
        id: testTenantAId,
        slug: 'tienda-alfa',
        name: 'Tienda Moda Alfa',
        currency: 'EUR',
        status: 'active'
      }
    });

    // Create/Upsert Test Tenant B
    await (prisma as any).tenant.upsert({
      where: { id: testTenantBId },
      update: { status: 'active', name: 'Tienda Tech Beta', currency: 'EUR' },
      create: {
        id: testTenantBId,
        slug: 'tienda-beta',
        name: 'Tienda Tech Beta',
        currency: 'EUR',
        status: 'active'
      }
    });

    // Product A1 (Tenant A, Price 100.00€, Stock: 10, Status: active)
    const prodA1Id = 'prod_sec_a1';
    await (prisma as any).product.upsert({
      where: { id: prodA1Id },
      update: { price: 100.0, stock: 10, status: 'active', tenantId: testTenantAId, sku: 'SKU-A1' },
      create: {
        id: prodA1Id,
        tenantId: testTenantAId,
        title: 'Chaqueta de Cuero Premium',
        price: 100.0,
        stock: 10,
        status: 'active',
        sku: 'SKU-A1'
      }
    });

    // Product A2 (Tenant A, Single stock item for concurrency testing: Stock: 1)
    const prodA2Id = 'prod_sec_a2_concurrency';
    await (prisma as any).product.upsert({
      where: { id: prodA2Id },
      update: { price: 50.0, stock: 1, status: 'active', tenantId: testTenantAId, sku: 'SKU-A2' },
      create: {
        id: prodA2Id,
        tenantId: testTenantAId,
        title: 'Bolso Exclusivo Edición Limitada',
        price: 50.0,
        stock: 1,
        status: 'active',
        sku: 'SKU-A2'
      }
    });

    // Product A3 (Tenant A, Draft product: Status: draft)
    const prodA3DraftId = 'prod_sec_a3_draft';
    await (prisma as any).product.upsert({
      where: { id: prodA3DraftId },
      update: { price: 80.0, stock: 10, status: 'draft', tenantId: testTenantAId },
      create: {
        id: prodA3DraftId,
        tenantId: testTenantAId,
        title: 'Producto En Borrador No Disponible',
        price: 80.0,
        stock: 10,
        status: 'draft'
      }
    });

    // Product B1 (Tenant B, Price 250.00€, Stock: 5)
    const prodB1Id = 'prod_sec_b1';
    await (prisma as any).product.upsert({
      where: { id: prodB1Id },
      update: { price: 250.0, stock: 5, status: 'active', tenantId: testTenantBId, sku: 'SKU-B1' },
      create: {
        id: prodB1Id,
        tenantId: testTenantBId,
        title: 'Smartphone Nova Ultra',
        price: 250.0,
        stock: 5,
        status: 'active',
        sku: 'SKU-B1'
      }
    });

    // Coupon A1 (Tenant A, 20% discount, minSpend 50€, maxUses 5)
    const couponA1Code = 'ALFA20';
    await (prisma as any).coupon.upsert({
      where: { tenantId_code: { tenantId: testTenantAId, code: couponA1Code } },
      update: { status: 'ACTIVE', discountType: 'PERCENTAGE', discountValue: 20, minSpend: 50, maxUses: 5, usedCount: 0 },
      create: {
        id: 'cpn_sec_a1',
        tenantId: testTenantAId,
        code: couponA1Code,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minSpend: 50,
        maxUses: 5,
        usedCount: 0,
        status: 'ACTIVE'
      }
    });

    // Coupon B1 (Tenant B, 10€ fixed discount)
    const couponB1Code = 'BETA10';
    await (prisma as any).coupon.upsert({
      where: { tenantId_code: { tenantId: testTenantBId, code: couponB1Code } },
      update: { status: 'ACTIVE', discountType: 'FIXED', discountValue: 10, minSpend: 20, maxUses: 10, usedCount: 0 },
      create: {
        id: 'cpn_sec_b1',
        tenantId: testTenantBId,
        code: couponB1Code,
        discountType: 'FIXED',
        discountValue: 10,
        minSpend: 20,
        maxUses: 10,
        usedCount: 0,
        status: 'ACTIVE'
      }
    });

    console.log('✅ Entorno PostgreSQL inicializado correctamente.\n');

    // =========================================================================
    // 1. CHECKOUT NORMAL Y RECALCULO EXACTO DE PRECIOS
    // =========================================================================
    console.log('--- 1. CHECKOUT NORMAL Y RECALCULO DE TOTALES ---');
    const order1 = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Laura Gómez',
      customerEmail: 'laura@test.es',
      customerPhone: '+34600112233',
      shippingAddress: {
        address: 'Gran Vía 42',
        city: 'Madrid',
        postalCode: '28013',
        country: 'España'
      },
      items: [{ productId: prodA1Id, quantity: 2 }],
      paymentMethod: 'stripe',
      shippingMethod: 'correos_express'
    });

    assert(order1.success === true, 'Checkout normal exitoso');
    assert(order1.order?.subtotal === 200.0, `Subtotal calculado por servidor: ${order1.order?.subtotal}€ (2 x 100€)`);
    assert(order1.order?.status === 'pending', 'Estado de orden estrictamente inicializado en pending');
    assert(order1.order?.paymentStatus === 'pending', 'Estado de pago estrictamente inicializado en pending');
    assert(order1.order?.fulfillmentStatus === 'unfulfilled', 'Estado de fulfillment estrictamente unfulfilled');
    assert(order1.order?.orderItems?.length === 1, 'OrderItems creados con snapshot');
    assert(order1.order?.orderItems?.[0]?.sku === 'SKU-A1', 'Snapshot de SKU preservado en OrderItem');

    // =========================================================================
    // 2. DETECCIÓN Y MITIGACIÓN DE PRICE TAMPERING
    // =========================================================================
    console.log('\n--- 2. PROTECCIÓN CONTRA PRICE TAMPERING ---');
    // El cliente intenta forzar un precio manipulado (ej. 1 céntimo)
    const orderTamper = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Hacker Intent',
      customerEmail: 'hacker@test.es',
      shippingAddress: {
        address: 'Calle Falsa 123',
        city: 'Madrid',
        postalCode: '28001',
        country: 'España'
      },
      items: [{ productId: prodA1Id, quantity: 1, price: 0.01 } as any],
      paymentMethod: 'stripe'
    });

    assert(orderTamper.success === true, 'Procesa pedido ignorando precio del cliente');
    assert(
      orderTamper.order?.subtotal === 100.0,
      `Servidor recalculó contra PostgreSQL Product.price (100.00€), ignorando el 0.01€ del cliente`
    );

    // =========================================================================
    // 3. AISLAMIENTO CROSS-TENANT (PRODUCTO DE OTRO TENANT)
    // =========================================================================
    console.log('\n--- 3. AISLAMIENTO CROSS-TENANT (PRODUCTO) ---');
    // Tenant A intenta comprar un producto que pertenece a Tenant B
    const crossProdOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Intruso Cross',
      customerEmail: 'intruso@test.es',
      shippingAddress: {
        address: 'Av. Diagonal 1',
        city: 'Barcelona',
        postalCode: '08001',
        country: 'España'
      },
      items: [{ productId: prodB1Id, quantity: 1 }], // Prod B1 pertenece a Tenant B
      paymentMethod: 'stripe'
    });

    assert(
      crossProdOrder.success === false,
      'RECHAZADO: Compra de producto perteneciente a otro comercio bloqueada estrictamente'
    );

    // =========================================================================
    // 4. AISLAMIENTO CROSS-TENANT (CUPÓN DE OTRO TENANT)
    // =========================================================================
    console.log('\n--- 4. AISLAMIENTO CROSS-TENANT (CUPÓN) ---');
    // Tenant A intenta usar el cupón BETA10 que pertenece a Tenant B
    const crossCouponOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Usuario Cupon',
      customerEmail: 'cupon@test.es',
      shippingAddress: {
        address: 'Calle Mayor 10',
        city: 'Sevilla',
        postalCode: '41001',
        country: 'España'
      },
      items: [{ productId: prodA1Id, quantity: 1 }],
      paymentMethod: 'stripe',
      couponCode: couponB1Code // Cupón de Tenant B
    });

    assert(
      crossCouponOrder.success === false,
      'RECHAZADO: Uso de cupón perteneciente a otro comercio bloqueado estrictamente'
    );

    // =========================================================================
    // 5. CUPÓN AUTÉNTICO Y ATOMICIDAD DE CONTADOR
    // =========================================================================
    console.log('\n--- 5. CUPÓN AUTÉNTICO CON INCREMENTO ATÓMICO ---');
    const validCouponOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Cliente Descuento',
      customerEmail: 'descuento@test.es',
      shippingAddress: {
        address: 'Calle Colón 5',
        city: 'Valencia',
        postalCode: '46004',
        country: 'España'
      },
      items: [{ productId: prodA1Id, quantity: 1 }], // 100€
      paymentMethod: 'stripe',
      couponCode: couponA1Code // 20%
    });

    assert(validCouponOrder.success === true, 'Cupón válido aplicado correctamente');
    assert(validCouponOrder.order?.discount === 20.0, 'Descuento de 20.00€ aplicado');
    
    // Verificar en base de datos PostgreSQL que usedCount se incrementó
    const cpnAfter = await (prisma as any).coupon.findUnique({
      where: { tenantId_code: { tenantId: testTenantAId, code: couponA1Code } }
    });
    assert(cpnAfter.usedCount === 1, `Contador de uso de cupón en PostgreSQL incrementado atómicamente a 1`);

    // =========================================================================
    // 6. PROTECCIÓN CONTRA STOCK INSUFICIENTE
    // =========================================================================
    console.log('\n--- 6. VALIDACIÓN DE STOCK INSUFICIENTE ---');
    const overStockOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Cliente Ansioso',
      customerEmail: 'ansioso@test.es',
      shippingAddress: {
        address: 'Calle Sol 1',
        city: 'Madrid',
        postalCode: '28013',
        country: 'España'
      },
      items: [{ productId: prodA1Id, quantity: 9999 }], // Excede stock
      paymentMethod: 'stripe'
    });

    assert(overStockOrder.success === false, 'RECHAZADO: Pedido con cantidad mayor a stock disponible rechazado');

    // =========================================================================
    // 7. CONCURRENCIA DE STOCK (RACE CONDITION PREVENTION)
    // =========================================================================
    console.log('\n--- 7. CONCURRENCIA Y PREVENCIÓN DE RACE CONDITIONS ---');
    // Product A2 tiene exactamente stock = 1
    // Lanzamos 2 peticiones concurrentes simultáneas por la última unidad
    const [resConcurrent1, resConcurrent2] = await Promise.all([
      OrderService.createOrder({
        tenantId: testTenantAId,
        customerName: 'Comprador Rapido 1',
        customerEmail: 'rapido1@test.es',
        shippingAddress: { address: 'C1', city: 'M', postalCode: '28001', country: 'ES' },
        items: [{ productId: prodA2Id, quantity: 1 }],
        paymentMethod: 'stripe'
      }),
      OrderService.createOrder({
        tenantId: testTenantAId,
        customerName: 'Comprador Rapido 2',
        customerEmail: 'rapido2@test.es',
        shippingAddress: { address: 'C2', city: 'M', postalCode: '28001', country: 'ES' },
        items: [{ productId: prodA2Id, quantity: 1 }],
        paymentMethod: 'stripe'
      })
    ]);

    const successCount = (resConcurrent1.success ? 1 : 0) + (resConcurrent2.success ? 1 : 0);
    const failCount = (!resConcurrent1.success ? 1 : 0) + (!resConcurrent2.success ? 1 : 0);

    assert(
      successCount === 1 && failCount === 1,
      `Concurrencia atómica verificada: Exactamente 1 pedido tuvo éxito y 1 falló por stock insuficiente`
    );

    const prodA2Final = await (prisma as any).product.findUnique({ where: { id: prodA2Id } });
    assert(prodA2Final.stock === 0, 'Stock final del producto en PostgreSQL es exactamente 0 (nunca negativo)');

    // =========================================================================
    // 8. IDEMPOTENCIA Y PREVENCIÓN DE DUPLICADOS
    // =========================================================================
    console.log('\n--- 8. IDEMPOTENCIA (DOUBLE SUBMIT PROTECTION) ---');
    const testIdempotencyKey = 'idem_key_unique_test_8899';

    // Primer intento
    const idemOrder1 = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Cliente Red',
      customerEmail: 'red@test.es',
      shippingAddress: { address: 'C3', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA1Id, quantity: 1 }],
      paymentMethod: 'stripe',
      idempotencyKey: testIdempotencyKey
    });

    const stockBeforeSecondIdem = (await (prisma as any).product.findUnique({ where: { id: prodA1Id } })).stock;

    // Segundo intento con la misma clave de idempotencia
    const idemOrder2 = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Cliente Red',
      customerEmail: 'red@test.es',
      shippingAddress: { address: 'C3', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA1Id, quantity: 1 }],
      paymentMethod: 'stripe',
      idempotencyKey: testIdempotencyKey
    });

    const stockAfterSecondIdem = (await (prisma as any).product.findUnique({ where: { id: prodA1Id } })).stock;

    assert(idemOrder1.success === true, 'Primer intento de pedido con idempotencyKey creado');
    assert(idemOrder2.success === true, 'Segundo intento con misma idempotencyKey procesado idénticamente');
    assert(
      idemOrder1.order?.id === idemOrder2.order?.id,
      `Idempotencia garantizada: Retorna el mismo número de orden (${idemOrder1.order?.orderNumber})`
    );
    assert(
      stockBeforeSecondIdem === stockAfterSecondIdem,
      'No hubo doble decremento de stock por reintento de red'
    );

    // =========================================================================
    // 9. VALIDACIÓN ESTRICTA DE CANTIDADES (ANTI-TAMPERING)
    // =========================================================================
    console.log('\n--- 9. VALIDACIÓN ESTRICTA DE CANTIDADES ---');
    const negativeQty = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Tamper Qty',
      customerEmail: 'tamper@test.es',
      shippingAddress: { address: 'C', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA1Id, quantity: -5 }],
      paymentMethod: 'stripe'
    });
    assert(negativeQty.success === false, 'Cantidad negativa rechazada con error 400');

    const floatQty = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Tamper Qty Float',
      customerEmail: 'tamper@test.es',
      shippingAddress: { address: 'C', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA1Id, quantity: 1.5 }],
      paymentMethod: 'stripe'
    });
    assert(floatQty.success === false, 'Cantidad decimal/float rechazada con error 400');

    // =========================================================================
    // 10. PRODUCTO EN BORRADOR O INEXISTENTE
    // =========================================================================
    console.log('\n--- 10. PRODUCTOS DRAFT O NO DISPONIBLES ---');
    const draftOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Test Draft',
      customerEmail: 'draft@test.es',
      shippingAddress: { address: 'C', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA3DraftId, quantity: 1 }],
      paymentMethod: 'stripe'
    });
    assert(draftOrder.success === false, 'RECHAZADO: Producto en estado draft rechazado para compra');

    const nonExistentOrder = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Test None',
      customerEmail: 'none@test.es',
      shippingAddress: { address: 'C', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: 'prod_inexistente_99999', quantity: 1 }],
      paymentMethod: 'stripe'
    });
    assert(nonExistentOrder.success === false, 'RECHAZADO: Producto inexistente rechazado');

    // =========================================================================
    // 11. RESTAURACIÓN DE STOCK EN CANCELACIÓN
    // =========================================================================
    console.log('\n--- 11. RESTAURACIÓN DE STOCK EN CANCELACIÓN ---');
    const stockBeforeCancel = (await (prisma as any).product.findUnique({ where: { id: prodA1Id } })).stock;
    
    // Create an order of 2 items
    const orderToCancel = await OrderService.createOrder({
      tenantId: testTenantAId,
      customerName: 'Para Cancelar',
      customerEmail: 'cancelar@test.es',
      shippingAddress: { address: 'C', city: 'M', postalCode: '28001', country: 'ES' },
      items: [{ productId: prodA1Id, quantity: 2 }],
      paymentMethod: 'stripe'
    });
    const stockAfterOrder = (await (prisma as any).product.findUnique({ where: { id: prodA1Id } })).stock;
    assert(stockAfterOrder === stockBeforeCancel - 2, 'Stock decrementado al crear pedido');

    // Cancel order
    await OrderService.updateOrderStatus(testTenantAId, orderToCancel.order!.id, {
      status: 'cancelled'
    });
    const stockAfterCancel = (await (prisma as any).product.findUnique({ where: { id: prodA1Id } })).stock;
    assert(stockAfterCancel === stockBeforeCancel, 'Stock restaurado atómicamente en PostgreSQL tras cancelación');

    // =========================================================================
    // 12. SEPARACIÓN TOTAL DE LOS DOS COMERCIOS (SAAS vs STOREFRONT)
    // =========================================================================
    console.log('\n--- 12. SEPARACIÓN ABSOLUTA DE LOS DOS COMERCIOS ---');
    // FenixCMS SaaS sells Application/Plan/Subscription/License
    const saasSession = await SaaSCheckoutService.createSession({
      applicationId: 'app_ecommerce',
      planId: 'plan_pro',
      tenantSlug: 'tienda-alfa',
      tenantName: 'Tienda Moda Alfa',
      customerName: 'Admin Alfa',
      customerEmail: 'admin@alfa.es',
      billingPeriod: 'monthly',
      provider: 'STRIPE'
    });

    assert(saasSession.sessionId.startsWith('cs_saas_stripe_'), 'SaaS Checkout usa sesión propia y aislada');

    // Complete SaaS purchase
    const saasRes = await SaaSCheckoutService.verifyAndProcessPayment({
      provider: 'STRIPE',
      providerPaymentId: 'pi_saas_alfa_9988',
      sessionId: saasSession.sessionId,
      paymentId: saasSession.paymentId,
      rawPayload: { customer_email: 'admin@alfa.es' }
    });

    assert(saasRes.success === true, 'SaaS purchase completado');
    assert(saasRes.license !== undefined, 'Licencia generada en flujo SaaS');
    assert(saasRes.subscription !== undefined, 'Suscripción generada en flujo SaaS');

    // Verify SaaS checkout DID NOT create Storefront Order
    const storeOrders = await OrderService.listOrders(testTenantAId, { customerId: 'admin@alfa.es' });
    const saasPollutedOrders = storeOrders.orders.filter(o => o.customerEmail === 'admin@alfa.es');
    assert(
      saasPollutedOrders.length === 0,
      'SEPARACIÓN PERFECTA: La compra de suscripción SaaS FenixCMS jamás crea Order ni OrderItem de tienda'
    );

  } catch (error) {
    console.error('Error fatal en ejecución de tests:', error);
    failed++;
  }

  console.log('\n===================================================================');
  console.log(`📊 RESUMEN FASE 20-D.9: ${passed} PASSED | ${failed} FAILED`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecureStorefrontCheckoutTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
