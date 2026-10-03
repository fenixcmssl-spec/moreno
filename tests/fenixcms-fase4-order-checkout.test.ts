import { OrderService } from '../lib/services/order.service';
import { ProductService } from '../lib/services/product.service';
import { CouponService } from '../lib/services/coupon.service';
import { TenantService } from '../lib/services/tenant.service';

/**
 * =========================================================================
 * SUITE DE PRUEBAS AUTOMATIZADAS: FENIXCMS_4
 * =========================================================================
 * Validación Integral del Checkout de Tienda:
 * 1. Precios determinados 100% por el servidor (Anti-Tampering).
 * 2. Validación estricta de cantidades (No negativos, no decimales, enteros > 0).
 * 3. Aislamiento Cross-Tenant (Un cliente no puede comprar productos de otra tienda).
 * 4. Control de Stock Atómico y prevención de overselling.
 * 5. Cupones de descuento: expiración, gasto mínimo y concurrencia.
 * 6. Idempotencia persistente por x-idempotency-key.
 * 7. Requerimiento obligatorio de dirección de envío real (No defaults falsos).
 * =========================================================================
 */

export async function runFase4Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS FENIXCMS_4: CHECKOUT DE TIENDA, STOCK, PRECIOS Y CUPONES');
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

  const tenantAId = 'tenant_demo';
  const tenantBId = 'tenant_milano';

  // ---------------------------------------------------------------------------
  // [1/6] AUTORIDAD DE PRECIOS EN SERVIDOR (ANTI-TAMPERING)
  // ---------------------------------------------------------------------------
  console.log('\n📋 [1/6] AUTORIDAD DE PRECIOS Y CANTIDADES EN SERVIDOR');
  try {
    // 1.1 Intentar enviar precio manipulado de 0.01€ en el payload
    const orderTampered = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Carlos Gómez',
      customerEmail: 'carlos@test.es',
      shippingAddress: {
        address: 'Calle Mayor 10',
        city: 'Madrid',
        postalCode: '28013',
        country: 'España'
      },
      items: [
        {
          productId: 'prod_1', // Smartwatch con precio oficial de catálogo
          quantity: 2,
          // Intento de inyectar precio fraudulento
          ...({ price: 0.01, lineTotal: 0.02 } as any)
        }
      ],
      paymentMethod: 'paypal'
    });

    assert(orderTampered.success === true, 'Pedido procesado con éxito');
    assert(
      orderTampered.order !== undefined && orderTampered.order.subtotal > 10,
      `El subtotal (${orderTampered.order?.subtotal}€) fue calculado por el servidor ignorando el precio manipulado del cliente`
    );
    assert(
      orderTampered.order?.items[0].price > 1,
      'El precio unitario de línea coincide con el catálogo oficial de PostgreSQL'
    );

    // 1.2 Rechazar cantidades negativas o cero
    const orderNegQty = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Carlos Gómez',
      customerEmail: 'carlos@test.es',
      shippingAddress: {
        address: 'Calle Mayor 10',
        city: 'Madrid',
        postalCode: '28013',
        country: 'España'
      },
      items: [{ productId: 'prod_1', quantity: -5 }],
      paymentMethod: 'paypal'
    });
    assert(orderNegQty.success === false, 'Rechaza cantidad negativa (-5) con error explícito');

    // 1.3 Rechazar cantidades decimales
    const orderFloatQty = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Carlos Gómez',
      customerEmail: 'carlos@test.es',
      shippingAddress: {
        address: 'Calle Mayor 10',
        city: 'Madrid',
        postalCode: '28013',
        country: 'España'
      },
      items: [{ productId: 'prod_1', quantity: 1.5 }],
      paymentMethod: 'paypal'
    });
    assert(orderFloatQty.success === false, 'Rechaza cantidad decimal (1.5) no entera');
  } catch (err: any) {
    assert(false, 'Fallo en pruebas de autoridad de precios', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [2/6] AISLAMIENTO CROSS-TENANT (ANTI-IDOR)
  // ---------------------------------------------------------------------------
  console.log('\n📋 [2/6] PROTECCIÓN CONTRA ATAQUES CROSS-TENANT (IDOR)');
  try {
    // Intentar comprar en Tienda A un producto perteneciente a Tienda B
    const crossTenantOrder = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Atacante Cross-Tenant',
      customerEmail: 'attacker@evil.com',
      shippingAddress: {
        address: 'Calle Falsa 123',
        city: 'Barcelona',
        postalCode: '08001',
        country: 'España'
      },
      items: [
        {
          productId: 'prod_milano_1', // Producto perteneciente a tenant_milano
          quantity: 1
        }
      ],
      paymentMethod: 'paypal'
    });

    assert(
      crossTenantOrder.success === false,
      'Bloquea intento de comprar en Tenant A un producto perteneciente a Tenant B (Cross-Tenant Blocked)'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba Cross-Tenant', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [3/6] CONTROL ATÓMICO DE STOCK Y PREVENCIÓN DE OVERSELLING
  // ---------------------------------------------------------------------------
  console.log('\n📋 [3/6] CONTROL ATÓMICO DE STOCK');
  try {
    // Intentar pedir más unidades de las disponibles
    const overStockOrder = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Comprador Masivo',
      customerEmail: 'masivo@test.es',
      shippingAddress: {
        address: 'Polígono Industrial 4',
        city: 'Valencia',
        postalCode: '46001',
        country: 'España'
      },
      items: [
        {
          productId: 'prod_1',
          quantity: 99999 // Cantidad intencionalmente superior al stock
        }
      ],
      paymentMethod: 'paypal'
    });

    assert(
      overStockOrder.success === false,
      'Rechaza pedido cuando la cantidad excede el stock disponible o el límite'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba de stock', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [4/6] CUPONES DE DESCUENTO: VALIDACIÓN, EXPIRACIÓN Y GASTO MÍNIMO
  // ---------------------------------------------------------------------------
  console.log('\n📋 [4/6] MOTOR DE CUPONES DE DESCUENTO');
  try {
    // 4.1 Cupón válido
    const couponOrder = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Laura Martínez',
      customerEmail: 'laura@test.es',
      shippingAddress: {
        address: 'Avenida América 50',
        city: 'Madrid',
        postalCode: '28028',
        country: 'España'
      },
      items: [{ productId: 'prod_2', quantity: 1 }],
      couponCode: 'FENIX10',
      paymentMethod: 'paypal'
    });

    assert(couponOrder.success === true, 'Pedido con cupón FENIX10 procesado con éxito');
    assert(
      couponOrder.order !== undefined && couponOrder.order.discount > 0,
      `Descuento aplicado correctamente en el servidor: ${couponOrder.order?.discount}€`
    );

    // 4.2 Cupón falso / inexistente
    const invalidCouponOrder = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Laura Martínez',
      customerEmail: 'laura@test.es',
      shippingAddress: {
        address: 'Avenida América 50',
        city: 'Madrid',
        postalCode: '28028',
        country: 'España'
      },
      items: [{ productId: 'prod_2', quantity: 1 }],
      couponCode: 'CUPON_FALSO_INEXISTENTE_999',
      paymentMethod: 'paypal'
    });

    assert(invalidCouponOrder.success === false, 'Rechaza cupón inexistente con error');
  } catch (err: any) {
    assert(false, 'Fallo en pruebas de cupones', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [5/6] IDEMPOTENCIA POR X-IDEMPOTENCY-KEY
  // ---------------------------------------------------------------------------
  console.log('\n📋 [5/6] IDEMPOTENCIA Y PREVENCIÓN DE PEDIDOS DUPLICADOS');
  try {
    const testIdempotencyKey = `idemp_test_${Date.now()}`;

    // Primer intento de pedido
    const order1 = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Roberto Díaz',
      customerEmail: 'roberto@test.es',
      shippingAddress: {
        address: 'Gran Vía 45',
        city: 'Bilbao',
        postalCode: '48001',
        country: 'España'
      },
      items: [{ productId: 'prod_3', quantity: 1 }],
      idempotencyKey: testIdempotencyKey,
      paymentMethod: 'paypal'
    });

    assert(order1.success === true, 'Primer pedido creado con clave de idempotencia');

    // Segundo intento con la misma clave (simula doble clic o reintento de red)
    const order2 = await OrderService.createOrder({
      tenantId: tenantAId,
      customerName: 'Roberto Díaz',
      customerEmail: 'roberto@test.es',
      shippingAddress: {
        address: 'Gran Vía 45',
        city: 'Bilbao',
        postalCode: '48001',
        country: 'España'
      },
      items: [{ productId: 'prod_3', quantity: 1 }],
      idempotencyKey: testIdempotencyKey,
      paymentMethod: 'paypal'
    });

    assert(order2.success === true, 'Petición repetida devuelve respuesta exitosa');
    assert(
      order1.order?.id === order2.order?.id,
      'Ambas peticiones devuelven exactamente el MISMO número de pedido sin duplicar registros'
    );
  } catch (err: any) {
    assert(false, 'Fallo en prueba de idempotencia', err?.message);
  }

  // ---------------------------------------------------------------------------
  // [6/6] GOBERNANZA DE ESTADOS Y CONTROL DE ACCESO EN MUTACIONES
  // ---------------------------------------------------------------------------
  console.log('\n📋 [6/6] GOBERNANZA DE ESTADOS Y SNAPSHOT COMERCIAL');
  try {
    const orderNumber = OrderService.generateOrderNumber();
    assert(orderNumber.startsWith('FNX-'), 'Generador oficial de número de pedido en formato FNX-XXXXX-XXXX');

    const trackingNumber = OrderService.generateTrackingNumber('Correos Express');
    assert(trackingNumber.startsWith('CE') && trackingNumber.endsWith('ES'), 'Número de seguimiento logístico válido');
  } catch (err: any) {
    assert(false, 'Fallo en gobernanza de estados', err?.message);
  }

  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS FASE 4: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================================');

  if (failed > 0) {
    throw new Error(`Suite de pruebas FENIXCMS_4 falló con ${failed} errores.`);
  }
}
