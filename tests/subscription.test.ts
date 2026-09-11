import { SubscriptionService } from '../lib/services/subscription.service';
import { LicenseService } from '../lib/services/license.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runSubscriptionTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO PRUEBAS DE PASO 10 — SUBSCRIPTIONS');
  console.log('====================================================');

  // -------------------------------------------------------------
  // Test Suite 1: Separación de Subscription y License
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 1: Creación de Suscripción y Enlace con Licencia ---');

  const tenantId = 'tenant_sub_test';
  
  // Create associated license
  const license = LicenseService.create({
    licenseKey: 'FNX-SUB-TEST-KEY-001',
    tenantId: tenantId,
    tenantSlug: 'subteststore',
    tenantName: 'Subscription Test Store',
    applicationId: 'ECOMMERCE',
    planId: 'plan_pro',
    planName: 'Pro Plan',
    status: 'active',
    customerName: 'SaaS Client',
    customerEmail: 'client@saas.com',
    price: 39,
    billingPeriod: 'monthly',
    paymentProvider: 'stripe',
    transactionId: 'tx_sub_init',
    validFrom: new Date().toISOString(),
    validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    activationLimit: 1
  });

  // Create Subscription
  const sub = await SubscriptionService.createSubscription({
    tenantId,
    planId: 'plan_pro',
    provider: 'stripe',
    providerSubscriptionId: 'sub_stripe_real_999',
    billingPeriod: 'monthly',
    amount: 39,
    currency: 'EUR'
  });

  assert(sub.id.startsWith('sub_'), 'Suscripción creada con ID de formato válido');
  assert(sub.status === 'ACTIVE', 'Suscripción nueva debe tener estado ACTIVE');
  assert(sub.cancelAtPeriodEnd === false, 'cancelAtPeriodEnd debe inicializarse en false');
  assert(sub.tenantId === tenantId, 'TenantId debe coincidir');

  // Check that linked license is active
  const updatedLic = LicenseService.getByTenantId(tenantId);
  assert(updatedLic?.status === 'active', 'Licencia vinculada debe mantenerse activa');

  // -------------------------------------------------------------
  // Test Suite 2: Cancelación Programada (cancelAtPeriodEnd = true)
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Cancelación con cancelAtPeriodEnd = true ---');

  const cancelResult = await SubscriptionService.cancelSubscription(sub.id, {
    cancelAtPeriodEnd: true,
    reason: 'Customer requested cancellation at period end'
  });

  assert(cancelResult.success, 'Cancelación debe ser exitosa');
  assert(cancelResult.subscription?.cancelAtPeriodEnd === true, 'cancelAtPeriodEnd debe ser true');
  assert(cancelResult.subscription?.status === 'ACTIVE', 'Status debe seguir siendo ACTIVE durante el ciclo pagado');

  // Validate effectiveness
  const isEffective = SubscriptionService.isSubscriptionEffective(cancelResult.subscription!);
  assert(isEffective === true, 'Suscripción con cancelAtPeriodEnd sigue siendo efectiva hasta el vencimiento');

  // License remains active
  const licDuringPeriod = LicenseService.getByTenantId(tenantId);
  assert(licDuringPeriod?.status === 'active', 'Licencia permanece activa durante el ciclo cancelado');

  // -------------------------------------------------------------
  // Test Suite 3: Pago Fallido (PAST_DUE) y Período de Gracia
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Pago Fallido (PAST_DUE) y Período de Gracia ---');

  const failedResult = await SubscriptionService.handleFailedPayment(sub.id);
  assert(failedResult.success, 'Registro de fallo de pago exitoso');
  assert(failedResult.subscription?.status === 'PAST_DUE', 'Estado debe cambiar a PAST_DUE');

  // Verify grace period policy: not immediately revoked
  const isGraceEffective = SubscriptionService.isSubscriptionEffective(failedResult.subscription!);
  assert(isGraceEffective === true, 'PAST_DUE debe estar en período de gracia (no revocado inmediatamente)');

  // -------------------------------------------------------------
  // Test Suite 4: Pago Exitoso y Renovación
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Pago Exitoso y Renovación ---');

  const successPayment = await SubscriptionService.handleSuccessfulPayment(sub.id);
  assert(successPayment.success, 'Manejo de pago exitoso');
  assert(successPayment.subscription?.status === 'ACTIVE', 'Estado debe restaurarse a ACTIVE');

  // Verify license synchronization
  const finalLic = LicenseService.getByTenantId(tenantId);
  assert(finalLic?.status === 'active', 'Licencia debe estar activa tras el pago');

  // -------------------------------------------------------------
  // Test Suite 5: Cancelación Inmediata
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 5: Cancelación Inmediata ---');

  const immediateCancel = await SubscriptionService.cancelSubscription(sub.id, {
    cancelAtPeriodEnd: false
  });

  assert(immediateCancel.success, 'Cancelación inmediata procesada');
  assert(immediateCancel.subscription?.status === 'CANCELLED', 'Estado debe ser CANCELLED');

  console.log('====================================================');
  console.log('🏁 RESULTADO PASO 10: TODAS LAS PRUEBAS PASADAS CON ÉXITO');
  console.log('====================================================');
}

runSubscriptionTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
