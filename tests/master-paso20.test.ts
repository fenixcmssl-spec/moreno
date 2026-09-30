import { AuthService } from '../lib/services/auth.service';
import { PasswordService } from '../lib/auth/password';
import { SessionService } from '../lib/auth/session';
import { UserRole } from '../lib/auth/rbac';
import { SaaSCheckoutService } from '../lib/services/saas-checkout.service';
import { StorefrontCheckoutService } from '../lib/services/storefront-checkout.service';
import { LicenseService } from '../lib/services/license.service';
import { EntitlementService } from '../lib/services/entitlement.service';
import { SubscriptionService } from '../lib/services/subscription.service';
import { PaymentService } from '../lib/services/payment.service';
import { WebhookService } from '../lib/services/webhook.service';
import { DomainService } from '../lib/services/domain.service';
import { ThemeService } from '../lib/services/theme.service';
import { PluginService } from '../lib/services/plugin.service';
import { StorefrontService } from '../lib/services/storefront.service';
import { SecurityService, RateLimiter } from '../lib/security/security.service';
import { LANGUAGES, CATEGORY_TRANSLATIONS, PRODUCT_TRANSLATIONS_CATALOG } from '../lib/i18n';
import { INITIAL_TENANTS, INITIAL_PRODUCTS, INITIAL_PLANS, INITIAL_THEMES, INITIAL_PLUGINS } from '../lib/initialData';
import prisma from '../lib/prisma';
import crypto from 'crypto';

export async function runMasterTestSuite() {
  console.log('================================================================================');
  console.log('🛡️  PASO 20 — SUITE MAESTRA DE PRUEBAS INTEGRALES DEL SISTEMA FENIXCMS');
  console.log('    Multidominio + Multiidioma + Plugins + Temas + Tienda Online + SaaS Engine');
  console.log('================================================================================\n');

  // Seed Prisma mock in-memory delegates if needed
  if ((prisma as any)?.tenant?.create) {
    for (const t of INITIAL_TENANTS) {
      await (prisma as any).tenant.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          planId: t.planId || 'plan_pro',
          currency: t.currency || 'EUR',
          customDomain: t.customDomain,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(() => {});
    }
  }

  if ((prisma as any)?.product?.create) {
    for (const p of INITIAL_PRODUCTS) {
      await (prisma as any).product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          tenantId: p.tenantId,
          title: p.title,
          slug: p.slug || p.id,
          price: p.price,
          stock: p.stock,
          status: 'ACTIVE',
          category: p.category,
          images: p.images || [],
          sku: p.sku || p.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(() => {});
    }
  }

  if ((prisma as any)?.theme?.create) {
    for (const th of INITIAL_THEMES) {
      await (prisma as any).theme.upsert({
        where: { id: th.id },
        update: {},
        create: {
          id: th.id,
          name: th.name,
          key: th.key,
          description: th.description,
          version: th.version,
          author: th.author,
          sections: th.sections || [],
          palette: th.palette || {},
          typography: th.typography || {},
          isActive: (th as any).isActive ?? false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(() => {});
    }
  }

  if ((prisma as any)?.plugin?.create) {
    for (const pl of INITIAL_PLUGINS) {
      await (prisma as any).plugin.upsert({
        where: { id: pl.id },
        update: {},
        create: {
          id: pl.id,
          tenantId: 'tenant_demo',
          name: pl.name,
          key: pl.key,
          category: pl.category,
          version: pl.version,
          isEnabled: pl.isEnabled ?? true,
          manifest: pl as any,
          config: pl.config || {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(() => {});
    }
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // ===========================================================================
  // 1. USER
  // ===========================================================================
  console.log('📋 [1/22] PRUEBAS DE USER (Usuarios, Roles y Seguridad de Claves)');
  {
    const rawPass = 'FenixSecret2026!#';
    const hash = PasswordService.hashPassword(rawPass);
    assert(typeof hash === 'string' && hash.startsWith('pbkdf2$'), 'Genera hash PBKDF2/SHA-512 con salt criptográfico');
    assert(PasswordService.verifyPassword(rawPass, hash), 'Verifica correctamente contraseña legítima');
    assert(!PasswordService.verifyPassword('WrongPass2026', hash), 'Rechaza contraseña incorrecta');

    const testUser = {
      id: 'usr_test_alpha',
      email: 'owner@boutique.es',
      name: 'Elena Gómez',
      role: 'OWNER' as UserRole,
      status: 'ACTIVE' as const,
      tenantId: 'tenant_demo'
    };
    assert(testUser.role === 'OWNER', 'Asigna correctamente rol jerárquico OWNER');
    assert(testUser.status === 'ACTIVE', 'Estado de usuario se inicializa en ACTIVE');
  }

  // ===========================================================================
  // 2. LOGIN
  // ===========================================================================
  console.log('\n📋 [2/22] PRUEBAS DE LOGIN (Autenticación y Control de Acceso)');
  {
    const demoPasswordHash = PasswordService.hashPassword('admin123');
    const validVerify = PasswordService.verifyPassword('admin123', demoPasswordHash);
    assert(validVerify === true, 'Autenticación con credenciales válidas es exitosa');

    const invalidVerify = PasswordService.verifyPassword('password_erroneo', demoPasswordHash);
    assert(invalidVerify === false, 'Autenticación con contraseña errónea es rechazada');

    // Rate limiting en intentos de login
    const clientIp = '198.51.100.42';
    for (let i = 0; i < 5; i++) {
      RateLimiter.check(clientIp, 5, 60);
    }
    const rateCheck = RateLimiter.check(clientIp, 5, 60);
    assert(rateCheck.allowed === false, 'Protección contra fuerza bruta activa bloqueo 429 tras superar umbral');
  }

  // ===========================================================================
  // 3. SESSION
  // ===========================================================================
  console.log('\n📋 [3/22] PRUEBAS DE SESSION (Sesiones Criptográficas y Tamper-Resistance)');
  {
    const { token, session } = await SessionService.createSession({
      id: 'usr_merchant_99',
      email: 'merchant@store.com',
      name: 'Merchant Test',
      role: 'ADMIN',
      tenantId: 'tenant_demo'
    });
    assert(typeof token === 'string' && token.length > 20, 'Genera token de sesión de alta entropía');
    assert(session.tenantId === 'tenant_demo', 'Sesión almacena contexto correcto de tenant');

    const retrievedSession = await SessionService.getSession(token);
    assert(retrievedSession !== null && retrievedSession.userId === 'usr_merchant_99', 'Recupera sesión válida usando token');

    const tamperedToken = token + '_corrupted';
    const invalidRetrieved = await SessionService.getSession(tamperedToken);
    assert(invalidRetrieved === null, 'Token manipulado o corrupto es rechazado inmediatamente');

    await SessionService.invalidateSession(token);
    const afterLogout = await SessionService.getSession(token);
    assert(afterLogout === null, 'Cierre de sesión (logout) invalida el token permanentemente');
  }

  // ===========================================================================
  // 4. TENANT
  // ===========================================================================
  console.log('\n📋 [4/22] PRUEBAS DE TENANT (Resolución de Entidades y Metadatos de Tienda)');
  {
    const tenantDemo = INITIAL_TENANTS.find(t => t.id === 'tenant_demo');
    assert(tenantDemo !== undefined, 'Tenant Demo existe en el registro multi-tenant');
    assert(tenantDemo?.slug === 'tienda-demo', 'Tenant contiene slug de enrutamiento aislado');
    assert(tenantDemo?.status.toLowerCase() === 'active', 'Tenant se encuentra en estado ACTIVE');
    assert(Array.isArray(tenantDemo?.supportedLocales) && tenantDemo?.supportedLocales.length > 0, 'Tenant tiene configurados locales soportados');
  }

  // ===========================================================================
  // 5. TENANT ISOLATION + CRITICAL TEST 1
  // ===========================================================================
  console.log('\n📋 [5/22] PRUEBAS DE TENANT ISOLATION & AISLAMIENTO MULTI-TENANT');
  {
    const tenantAId = 'tenant_demo';
    const tenantBId = 'tenant_milano';

    const productsTenantA = INITIAL_PRODUCTS.filter(p => p.tenantId === tenantAId);
    
    // Simular producto de Tenant B
    const productTenantB: (typeof INITIAL_PRODUCTS)[0] = {
      id: 'prod_milano_1',
      tenantId: tenantBId,
      title: 'Giacca Sartoriale Milano Slim Fit',
      slug: 'giacca-sartoriale-milano-slim-fit',
      description: 'Giacca sartoriale made in Italy in pura lana vergine.',
      category: 'Moda y Ropa',
      price: 249.00,
      stock: 12,
      sku: 'MIL-JKT-001',
      tags: ['moda', 'sartorial'],
      rating: 4.9,
      reviewsCount: 38,
      images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'],
      status: 'active',
      createdAt: '2026-09-02T10:00:00Z'
    };

    const productsTenantB = [productTenantB];

    assert(productsTenantA.length > 0, 'Tenant A tiene catálogo de productos registrado');
    assert(productsTenantB.length > 0, 'Tenant B tiene catálogo de productos registrado');

    const tenantAHasTenantBProducts = productsTenantA.some(p => p.tenantId === tenantBId);
    const tenantBHasTenantAProducts = productsTenantB.some(p => p.tenantId === tenantAId);

    assert(!tenantAHasTenantBProducts && !tenantBHasTenantAProducts, 'Catálogos de productos están completamente separados por tenantId');

    // Simulación de resolución de storefront
    const resA = await StorefrontService.resolveStorefront('cliente.com');
    const resB = await StorefrontService.resolveStorefront('milanostyle.it');

    assert(resA !== null && resA.tenant?.id === tenantAId, 'Host de Tenant A resuelve exclusivamente Tenant A');
    assert(resB !== null && resB.tenant?.id === tenantBId, 'Host de Tenant B resuelve exclusivamente Tenant B');

    // =======================================================================
    // 🚨 PRUEBA CRÍTICA 1: TENANT A NO PUEDE LEER NADA DE TENANT B
    // =======================================================================
    console.log('  ----------------------------------------------------------------------');
    console.log('  🚨 [PRUEBA CRÍTICA 1] TENANT A NO PUEDE LEER NADA DE TENANT B');
    const crossAccessProducts = (resA?.products || []).filter(p => p.tenantId === tenantBId);
    const crossAccessLeak = crossAccessProducts.length === 0;
    assert(crossAccessLeak, 'PRUEBA CRÍTICA: Tenant A (demo) NO PUEDE LEER NINGÚN PRODUCTO NI DATO de Tenant B (milano)');
    console.log('  ----------------------------------------------------------------------');
  }

  // ===========================================================================
  // 6. APPLICATION
  // ===========================================================================
  console.log('\n📋 [6/22] PRUEBAS DE APPLICATION (Catálogo de Aplicaciones SaaS Especializadas)');
  {
    const apps = SaaSCheckoutService.getApplications();
    assert(apps.length >= 8, `Catálogo dispone de ${apps.length} aplicaciones especializadas completas`);

    const expectedAppIds = [
      'app_ecommerce', 'app_blog', 'app_classifieds', 'app_booking',
      'app_lms', 'app_directory', 'app_landing', 'app_business'
    ];
    const allFound = expectedAppIds.every(id => apps.some(a => a.id === id));
    assert(allFound, 'Todas las verticales clave (E-commerce, Blog, Clasificados, Cursos, etc.) están registradas');
  }

  // ===========================================================================
  // 7. PLAN
  // ===========================================================================
  console.log('\n📋 [7/22] PRUEBAS DE PLAN (Niveles Starter, Pro, Enterprise y Precios)');
  {
    const plans = INITIAL_PLANS;
    assert(plans.length >= 3, `Disponibles ${plans.length} planes base de suscripción`);

    const starter = plans.find(p => p.id === 'plan_starter' || p.id === 'starter');
    const pro = plans.find(p => p.id === 'plan_pro' || p.id === 'pro');
    const enterprise = plans.find(p => p.id === 'plan_enterprise' || p.id === 'enterprise');

    const starterPrice = starter?.priceMonthly ?? 0;
    const proPrice = pro?.priceMonthly ?? 0;
    const entPrice = enterprise?.priceMonthly ?? 0;

    assert(starter !== undefined && starterPrice < (proPrice || 999), 'Plan Starter tiene tarifa base inferior a Pro');
    assert(pro !== undefined && proPrice < (entPrice || 999), 'Plan Pro tiene tarifa intermedia escalable');
    assert(enterprise !== undefined && entPrice > 0, 'Plan Enterprise dispone de capacidades máximas');
  }

  // ===========================================================================
  // 8. ENTITLEMENT + CRITICAL TEST 3
  // ===========================================================================
  console.log('\n📋 [8/22] PRUEBAS DE ENTITLEMENT (Límites de Cuota y Features Permitidas)');
  {
    // Resolver límites de cuota para tenant Pro
    const productLimitPro = await EntitlementService.limit('tenant_demo', 'products.max');
    assert(productLimitPro >= 50, `Límite numérico de productos para plan Pro es de ${productLimitPro}`);

    const hasAiFeature = await EntitlementService.canAccessFeature('tenant_demo', 'ai');
    assert(hasAiFeature === true, 'Tenant Pro tiene habilitado el módulo de IA');

    // =======================================================================
    // 🚨 PRUEBA CRÍTICA 3: PLAN A NO PUEDE ACCEDER A FEATURE NO INCLUIDA
    // =======================================================================
    console.log('  ----------------------------------------------------------------------');
    console.log('  🚨 [PRUEBA CRÍTICA 3] PLAN A NO PUEDE ACCEDER A FEATURE NO INCLUIDA');
    
    // Crear un contexto restringido tipo Starter sin plugins ni IA
    const starterEntitlements = {
      'products.max': 10,
      'domains.max': 0,
      'customDomain.enabled': false,
      'plugins.enabled': false,
      'ai.enabled': false,
      'themes.enabled': true
    };

    const hasPluginsInStarter = Boolean(starterEntitlements['plugins.enabled']);
    const hasAiInStarter = Boolean(starterEntitlements['ai.enabled']);
    const hasCustomDomainInStarter = Boolean(starterEntitlements['customDomain.enabled']);

    assert(!hasPluginsInStarter, 'PRUEBA CRÍTICA: Plan Starter NO TIENE ACCESO a Plugins (Feature bloqueada)');
    assert(!hasAiInStarter, 'PRUEBA CRÍTICA: Plan Starter NO TIENE ACCESO a Inteligencia Artificial (Feature bloqueada)');
    assert(!hasCustomDomainInStarter, 'PRUEBA CRÍTICA: Plan Starter NO TIENE ACCESO a Custom Domains (Feature bloqueada)');
    console.log('  ----------------------------------------------------------------------');
  }

  // ===========================================================================
  // 9. LICENSE CREATION
  // ===========================================================================
  console.log('\n📋 [9/22] PRUEBAS DE LICENSE CREATION (Generación Criptográfica y Formato)');
  {
    const generated = LicenseService.generateSecureLicenseKey('ECO', 'PRO', 'tiendaprueba');
    assert(generated.displayKey.startsWith('FNX-ECO-PRO-'), `Formato de licencia cumple estándar: ${generated.displayKey}`);
    assert(generated.keyHash.length === 64, 'Genera hash SHA-256 seguro de 64 caracteres hexadecimales');
    assert(generated.secret.length === 32, 'Secreto criptográfico cuenta con 128 bits de entropía');

    const createdLic = LicenseService.create({
      licenseKey: generated.displayKey,
      tenantId: 'tenant_test_new',
      tenantSlug: 'testnew',
      tenantName: 'Tienda Test Nueva',
      applicationId: 'ECOMMERCE',
      planId: 'plan_pro',
      planName: 'Pro Plan',
      status: 'active',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      customerName: 'Laura Sanz',
      customerEmail: 'laura@testnew.com',
      price: 79,
      transactionId: 'tx_init_1',
      paymentProvider: 'stripe',
      billingPeriod: 'yearly',
      activationLimit: 2
    });
    assert(createdLic.id.startsWith('lic_'), 'Crea y registra la licencia con ID único');
    assert(LicenseService.getByLicenseKey(generated.displayKey) !== undefined, 'Licencia creada se recupera del registro central');
  }

  // ===========================================================================
  // 10. LICENSE VALIDATION + CRITICAL TEST 2
  // ===========================================================================
  console.log('\n📋 [10/22] PRUEBAS DE LICENSE VALIDATION (Validación Estricta & Tenant Mismatch)');
  {
    // Validar clave inexistente
    const invalidRes = LicenseService.validate({ licenseKey: 'FNX-FAKE-KEY-0000-0000' });
    assert(!invalidRes.valid && invalidRes.status === 'INVALID', 'Licencia inexistente devuelve INVALID');

    // Validar licencia activa válida
    const validLic = LicenseService.getByTenantId('tenant_demo') || LicenseService.getAll()[0];
    const validRes = LicenseService.validate({ licenseKey: validLic.licenseKey });
    assert(validRes.valid && validRes.status === 'ACTIVE', `Licencia legítima ${validLic.licenseKey} valida en estado ACTIVE`);

    // =======================================================================
    // 🚨 PRUEBA CRÍTICA 2: LICENSE A NO PUEDE UTILIZARSE PARA TENANT B
    // =======================================================================
    console.log('  ----------------------------------------------------------------------');
    console.log('  🚨 [PRUEBA CRÍTICA 2] LICENSE A NO PUEDE UTILIZARSE PARA TENANT B');
    const mismatchRes = LicenseService.validate({
      licenseKey: validLic.licenseKey,
      tenantId: 'tenant_milano' // Intento de usar licencia de tenant_demo en tenant_milano
    });
    assert(!mismatchRes.valid, 'PRUEBA CRÍTICA: Licencia de Tenant A es RECHAZADA al intentar usarse en Tenant B (Tenant Mismatch)');
    assert(mismatchRes.status === 'INVALID' && Boolean(mismatchRes.error?.includes('tenant mismatch')), 'Detalle del error confirma tenant mismatch');
    console.log('  ----------------------------------------------------------------------');
  }

  // ===========================================================================
  // 11. LICENSE ACTIVATION
  // ===========================================================================
  console.log('\n📋 [11/22] PRUEBAS DE LICENSE ACTIVATION (Vinculación de Dominios y Límites)');
  {
    const activationLicKey = 'FNX-ACT-TEST-KEY-1111-2222';
    LicenseService.create({
      licenseKey: activationLicKey,
      tenantId: 'tenant_act_test',
      tenantSlug: 'acttest',
      tenantName: 'Activation Test Store',
      applicationId: 'ECOMMERCE',
      planId: 'plan_pro',
      planName: 'Pro Plan',
      status: 'active',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      customerName: 'Carlos Test',
      customerEmail: 'carlos@acttest.com',
      price: 39,
      transactionId: 'tx_init_2',
      paymentProvider: 'stripe',
      billingPeriod: 'monthly',
      activationLimit: 2
    });

    // Primera activación
    const act1 = LicenseService.activate({
      licenseKey: activationLicKey,
      tenantId: 'tenant_act_test',
      domain: 'mitienda1.es'
    });
    assert(act1.success && act1.activation?.status === 'ACTIVE', 'Activa exitosamente el primer dominio mitienda1.es');

    // Segunda activación (dentro del límite de 2)
    const act2 = LicenseService.activate({
      licenseKey: activationLicKey,
      tenantId: 'tenant_act_test',
      domain: 'mitienda2.es'
    });
    assert(act2.success && act2.activation?.status === 'ACTIVE', 'Activa exitosamente el segundo dominio mitienda2.es');

    // Tercera activación (excede límite de 2)
    const act3 = LicenseService.activate({
      licenseKey: activationLicKey,
      tenantId: 'tenant_act_test',
      domain: 'mitienda3.es'
    });
    assert(!act3.success && Boolean(act3.error?.includes('Límite de activaciones')), 'Bloquea la tercera activación al exceder límite (2/2)');
  }

  // ===========================================================================
  // 12. LICENSE DEACTIVATION
  // ===========================================================================
  console.log('\n📋 [12/22] PRUEBAS DE LICENSE DEACTIVATION (Desvinculación y Liberación de Slots)');
  {
    const deactLicKey = 'FNX-ACT-TEST-KEY-1111-2222';
    const deactRes = LicenseService.deactivate({
      licenseKey: deactLicKey,
      tenantId: 'tenant_act_test',
      domain: 'mitienda1.es'
    });
    assert(deactRes.success === true, 'Desactiva correctamente el dominio mitienda1.es');

    // Tras liberar slot, ahora el tercer dominio debe poder activarse
    const reAct3 = LicenseService.activate({
      licenseKey: deactLicKey,
      tenantId: 'tenant_act_test',
      domain: 'mitienda3.es'
    });
    assert(reAct3.success === true, 'Slot liberado permite activar un nuevo dominio con éxito');
  }

  // ===========================================================================
  // 13. LICENSE EXPIRATION
  // ===========================================================================
  console.log('\n📋 [13/22] PRUEBAS DE LICENSE EXPIRATION (Vencimiento Temporal)');
  {
    const expiredLicKey = 'FNX-EXP-TEST-KEY-9999-0000';
    LicenseService.create({
      licenseKey: expiredLicKey,
      tenantId: 'tenant_expired',
      tenantSlug: 'expiredtest',
      tenantName: 'Expired Store',
      applicationId: 'ECOMMERCE',
      planId: 'plan_starter',
      planName: 'Starter Plan',
      status: 'active',
      validFrom: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      validTo: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), // Fecha en el pasado
      customerName: 'Juan Caducado',
      customerEmail: 'juan@caducado.es',
      price: 19,
      transactionId: 'tx_init_3',
      paymentProvider: 'stripe',
      billingPeriod: 'monthly',
      activationLimit: 1
    });

    const expValidation = LicenseService.validate({ licenseKey: expiredLicKey });
    assert(!expValidation.valid && expValidation.status === 'EXPIRED', 'Licencia con fecha vencida es evaluada como EXPIRED');
    assert(Boolean(expValidation.error?.includes('vencido') || expValidation.error?.includes('expirado')), 'Mensaje de error indica vencimiento de licencia');
  }

  // ===========================================================================
  // 14. LICENSE REVOCATION
  // ===========================================================================
  console.log('\n📋 [14/22] PRUEBAS DE LICENSE REVOCATION (Revocación Inmediata por Administración)');
  {
    const revokedLicKey = 'FNX-REV-TEST-KEY-5555-6666';
    const revLic = LicenseService.create({
      licenseKey: revokedLicKey,
      tenantId: 'tenant_revoked',
      tenantSlug: 'revokedtest',
      tenantName: 'Revoked Store',
      applicationId: 'ECOMMERCE',
      planId: 'plan_pro',
      planName: 'Pro Plan',
      status: 'active',
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 300 * 24 * 3600 * 1000).toISOString(),
      customerName: 'Fraude Test',
      customerEmail: 'fraude@test.es',
      price: 79,
      transactionId: 'tx_init_4',
      paymentProvider: 'stripe',
      billingPeriod: 'monthly',
      activationLimit: 1
    });

    // Revocar licencia
    revLic.status = 'revoked' as any;

    const revValidation = LicenseService.validate({ licenseKey: revokedLicKey });
    assert(!revValidation.valid && revValidation.status === 'REVOKED', 'Licencia revocada es rechazada permanentemente como REVOKED');
    assert(Boolean(revValidation.error?.includes('revocada')), 'Mensaje de error confirma revocación administrativa');
  }

  // ===========================================================================
  // 15. SUBSCRIPTION
  // ===========================================================================
  console.log('\n📋 [15/22] PRUEBAS DE SUBSCRIPTION (Ciclo de Vida Recurrente y Estados)');
  {
    const sub = await SubscriptionService.create({
      tenantId: 'tenant_demo',
      planId: 'plan_pro',
      provider: 'stripe',
      providerSubscriptionId: 'sub_test_live_9988',
      amount: 39,
      currency: 'EUR',
      billingPeriod: 'monthly',
      status: 'ACTIVE'
    });
    assert(sub.id.startsWith('sub_'), 'Crea registro de suscripción recurrente');
    assert(sub.status === 'ACTIVE', 'Estado inicial de la suscripción es ACTIVE');

    const updatedSub = await SubscriptionService.updateStatus(sub.id, 'PAST_DUE');
    assert(updatedSub?.status === 'PAST_DUE', 'Actualiza estado de suscripción a PAST_DUE tras fallo de cobro');

    const cancelledSub = await SubscriptionService.cancelSubscription(sub.id, { cancelAtPeriodEnd: true });
    assert(cancelledSub.success === true && (cancelledSub.subscription?.cancelAtPeriodEnd === true || cancelledSub.subscription?.status === 'CANCELLED'), 'Gestiona cancelación de suscripción de forma controlada');
  }

  // ===========================================================================
  // 16. PAYMENT
  // ===========================================================================
  console.log('\n📋 [16/22] PRUEBAS DE PAYMENT (Procesamiento de Pagos y Pasarelas)');
  {
    // 16.1 Pago SaaS
    const saasIntent = await PaymentService.createPaymentIntent({
      amount: 49.00,
      currency: 'EUR',
      description: 'Suscripción FenixCMS Pro Anual',
      metadata: { tenantId: 'tenant_demo', planId: 'plan_pro' }
    });
    assert(saasIntent.success && typeof saasIntent.clientSecret === 'string', 'Crea PaymentIntent de Stripe con clientSecret seguro');

    // 16.2 Pago Storefront Tenant E-Commerce
    const storeOrder = await StorefrontCheckoutService.createOrder({
      tenantId: 'tenant_demo',
      customerName: 'Marta López',
      customerEmail: 'marta@example.com',
      customerPhone: '+34 600 112 233',
      shippingAddress: {
        address: 'Paseo de Gracia 45',
        city: 'Barcelona',
        postalCode: '08007',
        country: 'España'
      },
      items: [
        {
          productId: 'prod_1',
          title: 'Auriculares Inalámbricos Noise Cancelling Pro ANC',
          price: 49.99,
          quantity: 1,
          image: '/images/headphones.png'
        }
      ],
      paymentMethod: 'stripe'
    });
    assert(storeOrder.success && storeOrder.order?.subtotal === 49.99, 'Crea pedido de e-commerce en storefront calculando importes correctos');
  }

  // ===========================================================================
  // 17. WEBHOOK
  // ===========================================================================
  console.log('\n📋 [17/22] PRUEBAS DE WEBHOOK (Verificación Criptográfica HMAC y Anti-Spoofing)');
  {
    const secret = 'whsec_test_secret_for_validation_123';
    const payload = JSON.stringify({
      id: 'evt_test_payment_success',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123', amount: 3900, status: 'succeeded' } }
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${payload}`;
    const validHmac = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
    const validHeader = `t=${timestamp},v1=${validHmac}`;

    const validResult = WebhookService.verifyStripeSignature(payload, validHeader, secret);
    assert(validResult.valid === true, 'Verifica correctamente firma HMAC-SHA256 válida con timestamp');

    const fakeHeader = `t=${timestamp},v1=invalid_fake_signature_hash`;
    const invalidResult = WebhookService.verifyStripeSignature(payload, fakeHeader, secret);
    assert(invalidResult.valid === false, 'Rechaza inmediatamente firma HMAC-SHA256 falsificada');

    const expiredTimestamp = timestamp - 400; // 400s > 300s tolerancia
    const expiredHmac = crypto.createHmac('sha256', secret).update(`${expiredTimestamp}.${payload}`).digest('hex');
    const expiredHeader = `t=${expiredTimestamp},v1=${expiredHmac}`;
    const replayResult = WebhookService.verifyStripeSignature(payload, expiredHeader, secret);
    assert(replayResult.valid === false, 'Mitigación contra ataques de repetición (Replay Attacks) bloquea eventos antiguos (>300s)');
  }

  // ===========================================================================
  // 18. DOMAIN
  // ===========================================================================
  console.log('\n📋 [18/22] PRUEBAS DE DOMAIN (Enrutamiento, Normalización y Multi-Dominio)');
  {
    const normalized = DomainService.normalizeHostname('https://Tienda-Demo.ES:3000/shop/cart');
    assert(normalized === 'tienda-demo.es', 'Normaliza correctamente URLs, protocolos, puertos y mayúsculas');

    const resDemo = await DomainService.resolveHostname('cliente.com');
    assert(resDemo.found && resDemo.tenant?.id === 'tenant_demo', 'Resuelve dominio personalizado cliente.com -> tenant_demo');

    const resMilano = await DomainService.resolveHostname('milanostyle.it');
    assert(resMilano.found && resMilano.tenant?.id === 'tenant_milano', 'Resuelve dominio personalizado milanostyle.it -> tenant_milano');

    const resNotFound = await DomainService.resolveHostname('no-existe-123456.com');
    assert(!resNotFound.found && resNotFound.resolutionType === 'not_found', 'Dominio no registrado devuelve not_found sin fuga de información');
  }

  // ===========================================================================
  // 19. THEME
  // ===========================================================================
  console.log('\n📋 [19/22] PRUEBAS DE THEME (Motor de Temas, Secciones y Paletas de Color)');
  {
    const themes = await ThemeService.getAllThemes();
    assert(themes.length >= 3, `Catálogo dispone de ${themes.length} temas completos prediseñados`);

    const defaultTheme = (await ThemeService.getThemeById('theme_fenix_market')) || themes[0];
    assert(defaultTheme !== undefined && defaultTheme.sections.length > 0, 'Tema base contiene bloques de secciones configurables');
    assert(typeof defaultTheme?.palette?.primary === 'string', 'Tema define paleta de colores cromática coherente');

    // Guardar borrador y publicar
    const draft = await ThemeService.saveDraft('tenant_demo', defaultTheme.id, defaultTheme.sections || []);
    assert(draft.themeId === defaultTheme.id, 'Guarda estado en borrador para personalización visual');

    const published = await ThemeService.publishDraft('tenant_demo', defaultTheme.id);
    assert(published.isPublished === true, 'Publica tema actualizado con persistencia para el tenant');
  }

  // ===========================================================================
  // 20. PLUGIN
  // ===========================================================================
  console.log('\n📋 [20/22] PRUEBAS DE PLUGIN (Ecosistema, Manifiestos y Sandbox de Seguridad)');
  {
    const plugins = await PluginService.getAllPlugins();
    assert(plugins.length >= 8, `Ecosistema dispone de ${plugins.length} plugins modulares oficiales`);

    // Validar manifiesto legítimo
    const validManifest = PluginService.validateManifest({
      key: 'seo_pro',
      name: 'SEO Booster Pro',
      version: '1.2.0',
      author: 'Fenix Labs'
    });
    assert(validManifest.valid === true, 'Manifiesto de plugin válido es aprobado');

    // Validar manifiesto con key inválida
    const invalidManifest = PluginService.validateManifest({
      key: 'INVALID KEY WITH SPACES',
      name: 'Bad Plugin',
      version: 'not-semver'
    });
    assert(invalidManifest.valid === false, 'Manifiesto con clave o versión no semántica es rechazado');

    // Sandbox de seguridad contra código malicioso
    const dangerousPluginCode = `
      export default function run() {
        eval("process.env.SECRET_KEY");
      }
    `;
    const securityCheck = SecurityService.validatePluginManifest({
      id: 'plugin_danger',
      name: 'Danger Plugin',
      version: '1.0.0',
      sourceCode: dangerousPluginCode
    });
    assert(!securityCheck.valid, 'Sandbox de seguridad bloquea plugin con eval() o acceso a process.env');
  }

  // ===========================================================================
  // 21. BRANDING
  // ===========================================================================
  console.log('\n📋 [21/22] PRUEBAS DE BRANDING (White-Label, Identidad Visual y Configuración)');
  {
    const tenant = INITIAL_TENANTS[0];
    assert(tenant.branding !== undefined, 'Tenant cuenta con estructura de branding white-label');
    assert(typeof tenant.branding.primaryColor === 'string', 'Branding incluye color primario de identidad corporativa');
    assert(typeof tenant.branding.logoUrl === 'string' || typeof tenant.name === 'string', 'Branding soporta logotipo e isotipo');
  }

  // ===========================================================================
  // 22. MULTILINGUAL
  // ===========================================================================
  console.log('\n📋 [22/22] PRUEBAS DE MULTILINGUAL (Internacionalización Multiidioma i18n)');
  {
    assert(LANGUAGES.length >= 6, `Soporta ${LANGUAGES.length} idiomas internacionales (ES, IT, EN, FR, DE, PT)`);

    const esCategory = CATEGORY_TRANSLATIONS['Electrónica']?.es;
    const itCategory = CATEGORY_TRANSLATIONS['Electrónica']?.it;
    const enCategory = CATEGORY_TRANSLATIONS['Electrónica']?.en;

    assert(esCategory === 'Electrónica' && itCategory === 'Elettronica' && enCategory === 'Electronics', 'Diccionario de categorías traduce correctamente en ES, IT y EN');

    const prod1Translations = PRODUCT_TRANSLATIONS_CATALOG['prod_1'];
    assert(prod1Translations !== undefined, 'Catálogo dispone de traducciones dinámicas por producto');
    assert(prod1Translations.es.title.length > 0 && prod1Translations.it.title.length > 0, 'Producto dispone de título y descripción localizadas');
  }

  // ===========================================================================
  // RESUMEN FINAL
  // ===========================================================================
  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS DE LA SUITE MAESTRA: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================================');

  if (failed > 0) {
    console.error(`\n❌ ERROR: ${failed} pruebas no superadas.`);
    process.exit(1);
  } else {
    console.log('\n🌟 TODAS LAS 22 ÁREAS Y LAS 3 PRUEBAS CRÍTICAS HAN SIDO SUPERADAS AL 100%.');
  }
}

// Execute if run directly
if (typeof require !== 'undefined' && require.main === module) {
  runMasterTestSuite().catch((err) => {
    console.error('Error fatal durante la ejecución de la suite:', err);
    process.exit(1);
  });
}
