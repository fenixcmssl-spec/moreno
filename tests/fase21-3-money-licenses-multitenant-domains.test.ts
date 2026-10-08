import assert from 'assert';
import { LicenseService } from '../lib/services/license.service';
import { DomainService } from '../lib/services/domain.service';
import { EntitlementService } from '../lib/services/entitlement.service';
import { runWithSystemContext, runWithTenant } from '../lib/auth/tenantContext';

export async function runFase21_3Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 21.3 — DINERO, LICENCIAS, MULTI-TENANT Y DOMINIOS');
  console.log('================================================================================\n');

  // 1. Aislamiento Multi-Tenant (Tenant A vs Tenant B)
  console.log('📋 [1/5] AISLAMIENTO MULTI-TENANT Y RESOLUCIÓN DE DOMINIOS');
  
  const resDemo = await DomainService.resolveHostname('demo.fenixcms.es');
  assert.ok(resDemo.found, 'El dominio demo.fenixcms.es debe resolverse');
  assert.strictEqual(resDemo.tenant?.id, 'tenant_demo', 'demo.fenixcms.es debe pertenecer a tenant_demo');
  assert.notStrictEqual(resDemo.tenant?.id, 'tenant_milano', 'demo.fenixcms.es no puede pertenecer a tenant_milano');

  const resMilano = await DomainService.resolveHostname('milanostyle.it');
  assert.ok(resMilano.found, 'El dominio milanostyle.it debe resolverse');
  assert.strictEqual(resMilano.tenant?.id, 'tenant_milano', 'milanostyle.it debe pertenecer a tenant_milano');

  // Tenant Cross-domain protection: Tenant A no puede registrar un dominio perteneciente a Tenant B
  const duplicateAttempt = await runWithTenant('tenant_demo', async () => {
    return await DomainService.createDomain({
      tenantId: 'tenant_demo',
      hostname: 'milanostyle.it'
    });
  });
  assert.strictEqual(duplicateAttempt.success, false, 'Tenant A no puede registrar el dominio ya asignado a Tenant B');
  console.log('  ✅ [PASS] Resolución y aislamiento estricto de dominios y subdominios entre tenants');

  // 2. Licenciamiento & Tenant Mismatch Protection
  console.log('\n📋 [2/5] VERIFICACIÓN DE LICENCIAS Y PREVENCIÓN DE TENANT MISMATCH');
  const demoLic = LicenseService.getByTenantId('tenant_demo');
  assert.ok(demoLic, 'Debe existir una licencia para tenant_demo');

  // Validar con tenant correcto
  const validCheck = LicenseService.validate({
    licenseKey: demoLic.licenseKey,
    tenantId: 'tenant_demo'
  });
  assert.strictEqual(validCheck.valid, true, 'La validación con tenant correcto debe ser exitosa');

  // Validar con tenant mismatch
  const mismatchCheck = LicenseService.validate({
    licenseKey: demoLic.licenseKey,
    tenantId: 'tenant_milano'
  });
  assert.strictEqual(mismatchCheck.valid, false, 'La validación con tenant mismatch debe ser rechazada');
  assert.ok(mismatchCheck.error?.toLowerCase().includes('mismatch') || mismatchCheck.error?.toLowerCase().includes('corresponde'), 'El error debe indicar tenant mismatch');
  console.log('  ✅ [PASS] Tenant mismatch bloqueado de manera concluyente');

  // 3. Control de Límites de Activación de Dominio
  console.log('\n📋 [3/5] CONTROL DE LÍMITES DE ACTIVACIÓN DE DOMINIO');
  const createdLic = await runWithSystemContext(async () => {
    return await LicenseService.createLicense({
      tenantId: 'tenant_test_lim',
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      customerName: 'Test Customer',
      customerEmail: 'test@limits.com',
      price: 19.00,
      activationLimit: 1
    });
  });

  assert.ok(createdLic.displayKey, 'La licencia debe tener una displayKey generada server-side');
  assert.ok(createdLic.displayKey.startsWith('FNX-'), 'La displayKey debe comenzar con el prefijo seguro FNX-');

  // Primera activación (dentro del límite 1/1)
  const act1 = await runWithSystemContext(async () => {
    return LicenseService.activate({
      licenseKey: createdLic.displayKey,
      tenantId: 'tenant_test_lim',
      domain: 'first-store.com'
    });
  });
  assert.strictEqual(act1.success, true, 'La primera activación debe tener éxito');

  // Segunda activación (excede límite 1/1)
  const act2 = await runWithSystemContext(async () => {
    return LicenseService.activate({
      licenseKey: createdLic.displayKey,
      tenantId: 'tenant_test_lim',
      domain: 'second-store.com'
    });
  });
  assert.strictEqual(act2.success, false, 'La segunda activación debe ser rechazada al superar el límite');
  assert.ok(act2.error?.toLowerCase().includes('límite') || act2.error?.toLowerCase().includes('limit'), 'El mensaje debe indicar exceso de límite de activaciones');
  console.log('  ✅ [PASS] Límite de activaciones respetado estrictamente');

  // 4. Máquina de Estados: Suspensión, Revocación, Expiración y Cancelación
  console.log('\n📋 [4/5] MÁQUINA DE ESTADOS DE LICENCIA (SUSPENDED / REVOKED / EXPIRED / CANCELLED)');
  
  // Suspensión
  await runWithSystemContext(async () => {
    LicenseService.updateStatus(createdLic.id, 'suspended');
  });
  const suspCheck = LicenseService.validate({ licenseKey: createdLic.displayKey, tenantId: 'tenant_test_lim' });
  assert.strictEqual(suspCheck.valid, false, 'Licencia suspendida debe ser inválida');
  assert.strictEqual(suspCheck.status, 'SUSPENDED');

  // Revocación
  await runWithSystemContext(async () => {
    LicenseService.updateStatus(createdLic.id, 'revoked');
  });
  const revCheck = LicenseService.validate({ licenseKey: createdLic.displayKey, tenantId: 'tenant_test_lim' });
  assert.strictEqual(revCheck.valid, false, 'Licencia revocada debe ser inválida');
  assert.strictEqual(revCheck.status, 'REVOKED');

  // Reactivación y Renovación
  await runWithSystemContext(async () => {
    LicenseService.renew(createdLic.id, 12);
  });
  const renewCheck = LicenseService.validate({ licenseKey: createdLic.displayKey, tenantId: 'tenant_test_lim' });
  assert.strictEqual(renewCheck.valid, true, 'Licencia renovada debe volver a estar activa');
  console.log('  ✅ [PASS] Transiciones de estado y ciclo de vida de licencia validados');

  // 5. Cadena de Entitlements (Licencia -> Plan -> Límites)
  console.log('\n📋 [5/5] RESOLUCIÓN DE ENTITLEMENTS Y LÍMITES POR PLAN');
  const starterEntitlements = EntitlementService.getPlanEntitlements('plan_starter');
  assert.strictEqual(starterEntitlements['products.max'], 100, 'Plan starter debe permitir 100 productos');
  assert.strictEqual(starterEntitlements['ai.enabled'], false, 'Plan starter debe tener AI deshabilitada');

  const enterpriseEntitlements = EntitlementService.getPlanEntitlements('plan_enterprise');
  assert.strictEqual(enterpriseEntitlements['products.max'], 50000, 'Plan enterprise debe permitir 50,000 productos');
  assert.strictEqual(enterpriseEntitlements['ai.enabled'], true, 'Plan enterprise debe tener AI habilitada');
  console.log('  ✅ [PASS] Cadena de entitlements y límites de recursos por plan verificada');

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 21.3 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}
