import { LicenseService } from '../lib/services/license.service';
import { DomainService } from '../lib/services/domain.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runLicenseDomainTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DE PASO 9 — LICENSE ACTIVATION + DOMAIN');
  console.log('====================================================');

  // -------------------------------------------------------------
  // Test Suite 1: Reglas de Validación de Licencia
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 1: Validación y Reglas de Licencia ---');

  // 1. Clave inexistente
  const invalidKeyRes = LicenseService.validate({ licenseKey: 'FNX-INVALID-KEY' });
  assert(!invalidKeyRes.valid, 'Licencia inexistente debe ser inválida');
  assert(invalidKeyRes.status === 'INVALID', 'Status de licencia inexistente debe ser INVALID');

  // 2. Licencia activa válida
  const activeLicRes = LicenseService.validate({ licenseKey: 'FNX-PRO-9823-X981-DEMO' });
  assert(activeLicRes.valid, 'Licencia activa FNX-PRO-9823-X981-DEMO debe ser válida');
  assert(activeLicRes.status === 'ACTIVE', 'Status debe ser ACTIVE');

  // 3. Tenant mismatch
  const tenantMismatch = LicenseService.validate({
    licenseKey: 'FNX-PRO-9823-X981-DEMO',
    tenantId: 'tenant_otro_diferente'
  });
  assert(!tenantMismatch.valid, 'Tenant mismatch debe invalidar la verificación');
  assert(tenantMismatch.error?.includes('tenant mismatch') === true, 'Debe indicar tenant mismatch');

  // 4. Application mismatch
  const appMismatch = LicenseService.validate({
    licenseKey: 'FNX-PRO-9823-X981-DEMO',
    applicationId: 'INMOBILIARIA_EXCLUSIVA'
  });
  assert(!appMismatch.valid, 'Application mismatch debe invalidar la verificación');

  // -------------------------------------------------------------
  // Test Suite 2: Activación y Límite de Activaciones (activationLimit)
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Activación y Límite de Activaciones ---');

  // Crear una licencia de prueba con activationLimit = 2
  const testLicense = LicenseService.create({
    licenseKey: 'FNX-TEST-ACT-1234-5678',
    tenantId: 'tenant_test_act',
    tenantSlug: 'testact',
    tenantName: 'Test Activations Store',
    applicationId: 'ECOMMERCE',
    planId: 'plan_pro',
    planName: 'Pro Plan',
    status: 'active',
    customerName: 'Test Admin',
    customerEmail: 'admin@testact.com',
    price: 39,
    billingPeriod: 'monthly',
    paymentProvider: 'stripe',
    transactionId: 'tx_act_1',
    validFrom: new Date(Date.now() - 3600 * 1000).toISOString(),
    validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    activationLimit: 2
  });

  // Activación 1: dominio tienda1.com
  const act1 = LicenseService.activate({
    licenseKey: testLicense.licenseKey,
    tenantId: testLicense.tenantId,
    domain: 'tienda1.com',
    environment: 'production'
  });
  assert(act1.success, 'Primera activación (tienda1.com) debe ser exitosa');
  assert(act1.currentCount === 1, 'Conteo de activaciones debe ser 1');

  // Idempotencia: Reactivar mismo dominio no debe consumir otro slot
  const act1Repeat = LicenseService.activate({
    licenseKey: testLicense.licenseKey,
    tenantId: testLicense.tenantId,
    domain: 'tienda1.com'
  });
  assert(act1Repeat.success, 'Reactivación del mismo dominio debe ser idempotente');
  assert(act1Repeat.currentCount === 1, 'Conteo de activaciones no debe aumentar al repetir');

  // Activación 2: dominio tienda2.com
  const act2 = LicenseService.activate({
    licenseKey: testLicense.licenseKey,
    tenantId: testLicense.tenantId,
    domain: 'tienda2.com',
    environment: 'production'
  });
  assert(act2.success, 'Segunda activación (tienda2.com) debe ser exitosa');
  assert(act2.currentCount === 2, 'Conteo de activaciones debe ser 2');

  // Activación 3: debe fallar por superar activationLimit (2)
  const act3 = LicenseService.activate({
    licenseKey: testLicense.licenseKey,
    tenantId: testLicense.tenantId,
    domain: 'tienda3.com',
    environment: 'production'
  });
  assert(!act3.success, 'Tercera activación debe fallar por límite alcanzado');
  assert(act3.error?.includes('Límite de activaciones') === true, 'Error debe indicar límite alcanzado');

  // -------------------------------------------------------------
  // Test Suite 3: Desactivación y Liberación de Slot
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Desactivación y Liberación de Slot ---');

  const deactRes = LicenseService.deactivate({
    licenseKey: testLicense.licenseKey,
    domain: 'tienda1.com'
  });
  assert(deactRes.success, 'Desactivar tienda1.com debe ser exitoso');

  // Ahora activar tienda3.com debe funcionar porque se liberó un slot
  const act3AfterDeact = LicenseService.activate({
    licenseKey: testLicense.licenseKey,
    tenantId: testLicense.tenantId,
    domain: 'tienda3.com'
  });
  assert(act3AfterDeact.success, 'Activar tienda3.com tras liberar slot debe ser exitoso');

  // -------------------------------------------------------------
  // Test Suite 4: Regla No Activar Licencias Revocadas / Suspendidas
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Licencias Suspendidas / Revocadas / Expiradas ---');

  // Licencia expirada
  const expiredLicense = LicenseService.create({
    licenseKey: 'FNX-TEST-EXPIRED-9999',
    tenantId: 'tenant_expired',
    tenantSlug: 'testexpired',
    tenantName: 'Expired Store',
    applicationId: 'ECOMMERCE',
    planId: 'plan_starter',
    planName: 'Starter Plan',
    status: 'expired',
    customerName: 'Expired User',
    customerEmail: 'expired@test.com',
    price: 0,
    billingPeriod: 'monthly',
    paymentProvider: 'manual',
    transactionId: 'tx_exp',
    validFrom: '2025-01-01T00:00:00Z',
    validTo: '2025-02-01T00:00:00Z',
    activationLimit: 1
  });

  const actExpired = LicenseService.activate({
    licenseKey: expiredLicense.licenseKey,
    tenantId: expiredLicense.tenantId,
    domain: 'expired-store.com'
  });
  assert(!actExpired.success, 'No se debe permitir activar una licencia expirada');

  // -------------------------------------------------------------
  // Test Suite 5: Domain Service & Resolución Real de Hostname
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Domain Service & Resolución Real de Hostname ---');

  // 1. Crear dominio personalizado para tenant_demo (Plan Pro con domains.max: 3)
  const createdDomain = await DomainService.createDomain({
    tenantId: 'tenant_demo',
    hostname: 'boutique-madrid.es',
    type: 'custom',
    primary: false
  });
  assert(createdDomain.success, 'Debe crear dominio personalizado boutique-madrid.es');
  assert(createdDomain.domain?.hostname === 'boutique-madrid.es', 'Hostname debe estar normalizado');

  // 2. Resolver hostname -> Domain -> tenantId -> Tenant
  const resolution = await DomainService.resolveHostname('boutique-madrid.es');
  assert(resolution.found, 'Resolución de boutique-madrid.es debe ser found');
  assert(resolution.tenant?.id === 'tenant_demo', 'Debe resolver al tenant_demo real');
  assert(resolution.tenant?.slug === 'tienda-demo', 'Debe mapear al slug real tienda-demo');

  // 3. Demostración de NO hacer transformaciones naives (a.b.com != a-b-com)
  const nonExistentResolution = await DomainService.resolveHostname('random.unknown-site.org');
  assert(!nonExistentResolution.found, 'Dominio no registrado no debe inventar slug con guiones');
  assert(nonExistentResolution.resolutionType === 'not_found', 'Tipo de resolución debe ser not_found');

  console.log('====================================================');
  console.log('🏁 RESULTADO PASO 9: TODAS LAS PRUEBAS PASADAS CON ÉXITO');
  console.log('====================================================');
}

runLicenseDomainTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
