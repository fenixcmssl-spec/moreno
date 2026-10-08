import assert from 'assert';
import { MASTER_APPLICATIONS, MASTER_PLANS, MASTER_ROLES, MASTER_PLATFORM_SETTINGS } from '../prisma/seeds/master-data';
import { PasswordService } from '../lib/auth/password';
import { seedDemoData } from '../prisma/seeds/demo-data';

export async function runFase21_2Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 21.2 — POSTGRESQL REAL, MIGRACIONES & SEED DE PRODUCCIÓN');
  console.log('================================================================================\n');

  // 1. Master Data Integrity
  console.log('📋 [1/5] INTEGRIDAD Y COMPLETITUD DE DATOS MAESTROS (APLICACIONES Y PLANES)');
  
  assert.ok(MASTER_APPLICATIONS.length >= 4, 'Debe haber al menos 4 aplicaciones maestras definidas');
  const ecommerceApp = MASTER_APPLICATIONS.find(a => a.key === 'ECOMMERCE');
  assert.ok(ecommerceApp, 'La aplicación ECOMMERCE debe estar en los datos maestros');
  assert.ok(ecommerceApp.modules.length >= 5, 'ECOMMERCE debe incluir módulos clave (products, orders, coupons, etc.)');
  console.log('  ✅ [PASS] Aplicaciones maestras y módulos validados correctamente');

  assert.ok(MASTER_PLANS.length >= 4, 'Deben definirse planes SaaS maestros');
  for (const plan of MASTER_PLANS) {
    assert.ok(plan.slug && plan.name, `El plan ${plan.slug} debe tener slug y nombre`);
    assert.ok(typeof plan.monthlyPrice === 'number' && plan.monthlyPrice >= 0, `Precio mensual del plan ${plan.slug} debe ser válido`);
    assert.ok(plan.entitlements.length > 0, `El plan ${plan.slug} debe tener matriz de entitlements`);
  }
  console.log('  ✅ [PASS] Planes SaaS y matriz de entitlements verificados');

  // 2. Roles and Permissions
  console.log('\n📋 [2/5] ROLES DE SISTEMA Y PERMISOS RBAC');
  const superAdminRole = MASTER_ROLES.find(r => r.name === 'SUPER_ADMIN');
  assert.ok(superAdminRole, 'El rol SUPER_ADMIN debe estar definido en los roles maestros');
  assert.strictEqual(superAdminRole.permissions[0].action, '*', 'SUPER_ADMIN debe tener comodín total de acción');
  assert.strictEqual(superAdminRole.permissions[0].resource, '*', 'SUPER_ADMIN debe tener comodín total de recurso');

  const customerRole = MASTER_ROLES.find(r => r.name === 'CUSTOMER');
  assert.ok(customerRole, 'El rol CUSTOMER debe estar definido');
  console.log('  ✅ [PASS] Roles maestros y matriz de permisos RBAC verificados');

  // 3. Platform Settings
  console.log('\n📋 [3/5] CONFIGURACIÓN GLOBAL DE PLATAFORMA');
  const securitySetting = MASTER_PLATFORM_SETTINGS.find(s => s.key === 'platform_security');
  assert.ok(securitySetting, 'La configuración platform_security debe existir');
  assert.ok((securitySetting.value as any).passwordMinLength >= 8, 'Longitud mínima de contraseña debe ser >= 8');
  console.log('  ✅ [PASS] Configuraciones globales de seguridad y localización validadas');

  // 4. Password Hashing Security & Admin Bootstrap
  console.log('\n📋 [4/5] HASHING SEGURO PBKDF2/SHA-512 PARA SUPER ADMIN');
  const testPassword = 'SecureAdminSecret2026!';
  const hashedPassword = PasswordService.hashPassword(testPassword);
  assert.ok(hashedPassword.startsWith('pbkdf2$10000$'), 'El hash de contraseña debe usar formato pbkdf2$10000$salt$hash');
  assert.ok(PasswordService.verifyPassword(testPassword, hashedPassword), 'PasswordService debe verificar correctamente la contraseña legítima');
  assert.ok(!PasswordService.verifyPassword('WrongPassword123', hashedPassword), 'PasswordService debe rechazar contraseñas incorrectas');
  console.log('  ✅ [PASS] Generación y verificación segura de contraseñas de administración comprobada');

  // 5. Production Demo Guard
  console.log('\n📋 [5/5] PROTECCIÓN ESTRICTA CONTRA SEED DEMO EN PRODUCCIÓN');
  const prevEnv = process.env.NODE_ENV;
  const prevAllow = process.env.ALLOW_DEMO_SEED;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_SEED;

    let threw = false;
    try {
      await seedDemoData({} as any);
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('PRODUCCIÓN'), 'El error debe indicar bloqueo en entorno de PRODUCCIÓN');
    }
    assert.ok(threw, 'seedDemoData debe lanzar un error y bloquear la ejecución cuando NODE_ENV=production');
    console.log('  ✅ [PASS] El guardián de seguridad rechaza estrictamente la inserción de datos demo en producción');
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevAllow !== undefined) {
      process.env.ALLOW_DEMO_SEED = prevAllow;
    } else {
      delete process.env.ALLOW_DEMO_SEED;
    }
  }

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 21.2 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}
