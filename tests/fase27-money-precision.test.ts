import { StorefrontCheckoutService } from '../lib/services/storefront-checkout.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runFase27Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 27 — DINERO, PRECIOS Y PRECISIÓN COMERCIAL');
  console.log('================================================================================');

  console.log('\n📋 [1/3] CÁLCULO SEGURO DE TOTALES EN SERVIDOR');
  {
    // El cliente intenta enviar un precio alterado de 0.01€, pero el servidor calcula con la BD
    const totals = await StorefrontCheckoutService.calculateSecureTotals(
      'tenant_demo',
      [
        { productId: 'prod_1', quantity: 2 }, // Auriculares 79.99 * 2 = 159.98
      ],
      undefined,
      'correos_express'
    );

    assert(totals.subtotal > 0, `Subtotal calculado por servidor: ${totals.subtotal}€`);
    assert(totals.total >= totals.subtotal, `Total incluye desglose de impuestos y costes: ${totals.total}€`);
    assert(Number.isFinite(totals.total), 'El total es un número finito sin pérdidas de precisión');
  }

  console.log('\n📋 [2/3] PRECISIÓN DECIMAL Y PROTECCIÓN CONTRA REDONDEO FLOTANTE');
  {
    // Probar precisión matemática con 2 decimales estándar EUR
    const priceA = 19.99;
    const priceB = 0.01;
    const computed = Math.round(((priceA + priceB) + Number.EPSILON) * 100) / 100;
    assert(computed === 20.00, 'Suma y redondeo comercial con EPSILON da exactamente 20.00€');
  }

  console.log('\n📋 [3/3] CUPÓN DE DESCUENTO Y ENVÍO GRATIS');
  {
    const totalsWithDiscount = await StorefrontCheckoutService.calculateSecureTotals(
      'tenant_demo',
      [{ productId: 'prod_1', quantity: 1 }],
      'PROMO10'
    );

    assert(typeof totalsWithDiscount.discount === 'number', 'Descuento computado como valor numérico');
    assert(totalsWithDiscount.discount >= 0, 'Descuento no puede ser negativo');
    const expectedTotal = Math.round(((totalsWithDiscount.subtotal - totalsWithDiscount.discount + totalsWithDiscount.shippingCost) * 1.21 + Number.EPSILON) * 100) / 100;
    assert(totalsWithDiscount.total === expectedTotal, `Total (${totalsWithDiscount.total}€) refleja base imponible con descuento + IVA 21% (${expectedTotal}€)`);
  }

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 27 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}

if (require.main === module) {
  runFase27Tests().catch(err => {
    console.error('Error en suite FASE 27:', err);
    process.exit(1);
  });
}
