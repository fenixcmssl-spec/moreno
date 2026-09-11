import { EntitlementService } from '../lib/services/entitlement.service';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DEL ENTITLEMENT ENGINE (PASO 7)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: DENY BY DEFAULT - Non-existent Tenant
  // ----------------------------------------------------
  console.log('--- Test Suite 1: Regla DENY BY DEFAULT (Tenant inexistente) ---');
  const nonExistentCan = await EntitlementService.can('tenant_non_existent_999', 'products.enabled');
  assert(nonExistentCan === false, 'Tenant inexistente debe retornar can() === false (DENY BY DEFAULT)');

  const nonExistentLimit = await EntitlementService.limit('tenant_non_existent_999', 'products.max');
  assert(nonExistentLimit === 0, 'Tenant inexistente debe retornar limit() === 0 (NUNCA ilimitado)');

  const nonExistentRemaining = await EntitlementService.remaining('tenant_non_existent_999', 'products.max');
  assert(nonExistentRemaining === 0, 'Tenant inexistente debe retornar remaining() === 0');

  // ----------------------------------------------------
  // TEST 2: DENY BY DEFAULT - Missing Feature / Missing Limit
  // ----------------------------------------------------
  console.log('\n--- Test Suite 2: Regla DENY BY DEFAULT (Missing Feature / Resource) ---');
  const missingFeature = await EntitlementService.can('tenant_1', 'unregistered_feature_xyz');
  assert(missingFeature === false, 'Característica no registrada en el plan debe retornar can() === false (NUNCA true)');

  const missingResourceLimit = await EntitlementService.limit('tenant_1', 'unknown_resource_abc.max');
  assert(missingResourceLimit === 0, 'Recurso no registrado en el plan debe retornar limit() === 0 (NUNCA ilimitado)');

  // ----------------------------------------------------
  // TEST 3: DENY BY DEFAULT - Suspended Tenant
  // ----------------------------------------------------
  console.log('\n--- Test Suite 3: Regla DENY BY DEFAULT (Tenant suspendido) ---');
  const suspendedTenantObj = {
    id: 'tenant_suspended_test',
    slug: 'suspended-store',
    name: 'Suspended Store',
    status: 'suspended',
    planId: 'plan_pro',
    licenseKey: 'FNX-SUSP-1234'
  };
  const suspendedCan = await EntitlementService.can(suspendedTenantObj, 'blog.enabled');
  assert(suspendedCan === false, 'Tenant con status=suspended debe retornar can() === false');

  const suspendedLimit = await EntitlementService.limit(suspendedTenantObj, 'products.max');
  assert(suspendedLimit === 0, 'Tenant con status=suspended debe retornar limit() === 0');

  // ----------------------------------------------------
  // TEST 4: DENY BY DEFAULT - Expired License
  // ----------------------------------------------------
  console.log('\n--- Test Suite 4: Regla DENY BY DEFAULT (Licencia expirada) ---');
  const expiredTenantObj = {
    id: 'tenant_expired_test',
    slug: 'expired-store',
    name: 'Expired Store',
    status: 'active',
    planId: 'plan_pro',
    licenses: [
      {
        id: 'lic_expired',
        status: 'EXPIRED',
        expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        plan: {
          id: 'plan_pro',
          name: 'Pro Plan',
          entitlements: [
            { key: 'products.max', value: '1000', type: 'NUMBER' },
            { key: 'blog.enabled', value: 'true', type: 'BOOLEAN' }
          ]
        }
      }
    ]
  };
  const expiredCan = await EntitlementService.can(expiredTenantObj, 'blog.enabled');
  assert(expiredCan === false, 'Tenant con licencia expirada debe retornar can() === false');

  const expiredLimit = await EntitlementService.limit(expiredTenantObj, 'products.max');
  assert(expiredLimit === 0, 'Tenant con licencia expirada debe retornar limit() === 0');

  // ----------------------------------------------------
  // TEST 5: Effective Entitlements Resolution (Active Plan)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 5: Resolución de Plan Activo ---');
  const activeTenantObj = {
    id: 'tenant_active_test',
    slug: 'active-store',
    name: 'Active Store',
    status: 'active',
    planId: 'plan_pro',
    licenses: [
      {
        id: 'lic_active',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year ahead
        plan: {
          id: 'plan_pro',
          name: 'Pro Plan',
          entitlements: [
            { key: 'products.max', value: '500', type: 'NUMBER' },
            { key: 'orders.max', value: '2500', type: 'NUMBER' },
            { key: 'storage.max_mb', value: '5000', type: 'NUMBER' },
            { key: 'blog.enabled', value: 'true', type: 'BOOLEAN' },
            { key: 'ads.enabled', value: 'false', type: 'BOOLEAN' },
            { key: 'customDomain.enabled', value: 'true', type: 'BOOLEAN' },
            { key: 'domains.max', value: '3', type: 'NUMBER' }
          ]
        }
      }
    ]
  };

  const activeCanBlog = await EntitlementService.can(activeTenantObj, 'blog.enabled');
  assert(activeCanBlog === true, 'can(tenant, blog.enabled) debe ser true en plan Pro');

  const activeCanAds = await EntitlementService.can(activeTenantObj, 'ads.enabled');
  assert(activeCanAds === false, 'can(tenant, ads.enabled) debe ser false (explícito false)');

  const activeProductLimit = await EntitlementService.limit(activeTenantObj, 'products');
  assert(activeProductLimit === 500, `limit(tenant, products) debe ser 500 (obtenido: ${activeProductLimit})`);

  const activeStorageLimit = await EntitlementService.limit(activeTenantObj, 'storage');
  assert(activeStorageLimit === 5000, `limit(tenant, storage) debe ser 5000 MB (obtenido: ${activeStorageLimit})`);

  // ----------------------------------------------------
  // TEST 6: Tenant Overrides (Mayor prioridad que el Plan)
  // ----------------------------------------------------
  console.log('\n--- Test Suite 6: Overrides Explícitos a Nivel Tenant ---');
  const tenantWithOverrides = {
    ...activeTenantObj,
    settings: {
      overrides: {
        'products.max': 1200,      // Plan had 500 -> Override expands to 1200
        'ads.enabled': true,        // Plan had false -> Override enables ads
        'blog.enabled': false       // Plan had true -> Override disables blog
      }
    }
  };

  const overriddenProductLimit = await EntitlementService.limit(tenantWithOverrides, 'products');
  assert(overriddenProductLimit === 1200, `Override de products.max debe prevalecer (esperado: 1200, obtenido: ${overriddenProductLimit})`);

  const overriddenAdsCan = await EntitlementService.can(tenantWithOverrides, 'ads.enabled');
  assert(overriddenAdsCan === true, 'Override de ads.enabled=true debe habilitar la función');

  const overriddenBlogCan = await EntitlementService.can(tenantWithOverrides, 'blog.enabled');
  assert(overriddenBlogCan === false, 'Override de blog.enabled=false debe revocar la función');

  // ----------------------------------------------------
  // TEST 7: Remaining Capacity Calculations
  // ----------------------------------------------------
  console.log('\n--- Test Suite 7: Cálculo de remaining(tenant, resource) ---');
  const checkResult = await EntitlementService.checkResource(activeTenantObj, 'products', 1);
  assert(checkResult.allowed === true, 'checkResource() debe permitir creación si hay cupo');
  assert(checkResult.limit === 500, `checkResource() debe reflejar límite 500 (obtenido: ${checkResult.limit})`);
  assert(typeof checkResult.remaining === 'number' && checkResult.remaining <= 500, 'remaining debe ser un número <= límite');

  // ----------------------------------------------------
  // TEST 8: assertCan & assertCanCreate Exceptions
  // ----------------------------------------------------
  console.log('\n--- Test Suite 8: Assertions y Control de Excepciones ---');
  let threwForDisabledFeature = false;
  try {
    await EntitlementService.assertCan(activeTenantObj, 'ads.enabled');
  } catch (e: any) {
    threwForDisabledFeature = true;
    assert(e.statusCode === 403, 'assertCan debe lanzar error con status code 403 al denegar');
  }
  assert(threwForDisabledFeature, 'assertCan debe lanzar excepción cuando la función está denegada');

  let passedForEnabledFeature = false;
  try {
    await EntitlementService.assertCan(activeTenantObj, 'blog.enabled');
    passedForEnabledFeature = true;
  } catch {
    passedForEnabledFeature = false;
  }
  assert(passedForEnabledFeature, 'assertCan NO debe lanzar excepción cuando la función está permitida');

  // ----------------------------------------------------
  // TEST 9: getEffectiveEntitlements Payload Shape
  // ----------------------------------------------------
  console.log('\n--- Test Suite 9: Estructura de getEffectiveEntitlements ---');
  const effective = await EntitlementService.getEffectiveEntitlements(tenantWithOverrides);
  assert(effective.features['ads.enabled'] === true, 'getEffectiveEntitlements debe reflejar features con overrides');
  assert(effective.limits['products.max'] === 1200, 'getEffectiveEntitlements debe reflejar limits con overrides');
  assert(effective.isLicenseActive === true, 'getEffectiveEntitlements debe indicar isLicenseActive === true');

  // ----------------------------------------------------
  // RESUMEN
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 RESULTADO DE PRUEBAS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal durante la ejecución de pruebas:', err);
  process.exit(1);
});
