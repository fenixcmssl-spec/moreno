import { 
  TenantCreateSchema, 
  ProductSchema, 
  CheckoutSchema, 
  PaginationQuerySchema,
  formatApiSuccess,
  formatApiError 
} from '../lib/validators';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runFase26Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 26 — CONTRATO ÚNICO DE APIS Y VALIDACIÓN ZOD');
  console.log('================================================================================');

  console.log('\n📋 [1/4] VALIDACIÓN DE CREACIÓN DE TENANT');
  {
    const validTenant = {
      name: 'Mi Tienda Online',
      slug: 'mi-tienda-online',
      ownerEmail: 'owner@mitienda.es',
      ownerName: 'Juan Pérez',
      planId: 'plan_pro',
      applicationId: 'ECOMMERCE',
      currency: 'EUR',
      defaultLocale: 'es',
      supportedLocales: ['es', 'en']
    };

    const parsed = TenantCreateSchema.safeParse(validTenant);
    assert(parsed.success === true, 'TenantCreateSchema valida exitosamente payload legítimo');

    const invalidSlug = { ...validTenant, slug: 'SLUG WITH UPPERCASE & SPACES!' };
    const invalidParsed = TenantCreateSchema.safeParse(invalidSlug);
    assert(invalidParsed.success === false, 'TenantCreateSchema rechaza slugs no normalizados con espacios y mayúsculas');
  }

  console.log('\n📋 [2/4] VALIDACIÓN DE CHECKOUT Y LÍMITES DE CANTIDAD');
  {
    const validCheckout = {
      customerName: 'Carlos López',
      customerEmail: 'carlos@cliente.com',
      shippingAddress: {
        address: 'Calle Mayor 10, 2B',
        city: 'Valencia',
        postalCode: '46001',
        country: 'España'
      },
      items: [
        { productId: 'prod_1', quantity: 2 }
      ],
      paymentMethod: 'stripe'
    };

    const parsed = CheckoutSchema.safeParse(validCheckout);
    assert(parsed.success === true, 'CheckoutSchema valida datos de pedido y dirección');

    const invalidQuantity = {
      ...validCheckout,
      items: [{ productId: 'prod_1', quantity: -5 }]
    };
    const badQtyParsed = CheckoutSchema.safeParse(invalidQuantity);
    assert(badQtyParsed.success === false, 'CheckoutSchema rechaza cantidades negativas o iguales a cero');
  }

  console.log('\n📋 [3/4] LÍMITES MÁXIMOS ESTRICTOS EN PAGINACIÓN');
  {
    const validPage = PaginationQuerySchema.parse({ page: '2', limit: '25' });
    assert(validPage.page === 2 && validPage.limit === 25, 'PaginationQuerySchema convierte números y aplica valores válidos');

    const excessiveLimit = PaginationQuerySchema.safeParse({ limit: 500 });
    assert(excessiveLimit.success === false, 'PaginationQuerySchema rechaza límites excesivos (> 100) para proteger la BD');
  }

  console.log('\n📋 [4/4] FORMATO ESTANDARIZADO DE RESPUESTA Y ERROR DE API');
  {
    const successRes = formatApiSuccess({ id: 'item_1' }, { total: 1, page: 1 }, 'req_abc123');
    assert(successRes.success === true, 'formatApiSuccess establece success: true');
    assert(successRes.requestId === 'req_abc123', 'formatApiSuccess incluye requestId');
    assert(successRes.meta?.total === 1, 'formatApiSuccess incluye metadatos de paginación');

    const errorRes = formatApiError('INVALID_INPUT', 'Datos de formulario incompletos', { field: 'email' }, 'req_xyz789');
    assert(errorRes.success === false, 'formatApiError establece success: false');
    assert(errorRes.error?.code === 'INVALID_INPUT', 'formatApiError incluye código de error machine-readable');
    assert(errorRes.error?.details?.field === 'email', 'formatApiError incluye detalles contextualmente seguros');
  }

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 26 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}

if (require.main === module) {
  runFase26Tests().catch(err => {
    console.error('Error en suite FASE 26:', err);
    process.exit(1);
  });
}
