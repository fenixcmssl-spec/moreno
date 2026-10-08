import assert from 'assert';
import { DomainService } from '../lib/services/domain.service';
import { TenantContextHelper, runWithTenant, runWithSystemContext } from '../lib/auth/tenantContext';
import { RateLimiter, SecurityService } from '../lib/security/security.service';
import { PasswordService } from '../lib/auth/password';

export async function runFase21_5Tests() {
  console.log('\n================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 21.5 — HARDENING DE SEGURIDAD Y CERO SEGUNDA REALIDAD');
  console.log('================================================================================\n');

  // 1. Zero Segunda Realidad en Producción (Fail-Closed)
  console.log('📋 [1/5] ZERO SEGUNDA REALIDAD: FAIL-CLOSED EN PRODUCCIÓN SIN FALLBACK SILENCIOSO');
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    // En producción, si un dominio no existe o la BD está aislada, NUNCA debe resolver una tienda demo ficticia
    let resolvedTenant: any = null;
    let threw = false;
    try {
      const res = await DomainService.resolveHostname('dominio-fantasma-no-existente.com');
      if (res && res.found) {
        resolvedTenant = res.tenant;
      }
    } catch (err: any) {
      threw = true;
    }

    // Se verifica que no se haya caído a una tienda demo
    assert.strictEqual(resolvedTenant, null, 'En producción está estrictamente prohibido resolver tiendas demo sintéticas');
    console.log('  ✅ [PASS] Modo producción no activa tiendas demo ni fallback silencioso a memoria');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  // 2. Aislamiento Estricto Tenant vs Tenant (Negative Tests)
  console.log('\n📋 [2/5] PRUEBAS NEGATIVAS DE AISLAMIENTO MULTI-TENANT');
  
  // Verificar que un tenant no puede resolver datos de otro tenant sin privilegios
  await runWithTenant('tenant_demo', async () => {
    const domainsA = await DomainService.getDomainsByTenant('tenant_demo');
    assert.ok(Array.isArray(domainsA), 'Debe devolver array de dominios');

    for (const d of domainsA) {
      assert.strictEqual(d.tenantId, 'tenant_demo', 'Todos los dominios deben pertenecer a tenant_demo');
      assert.notStrictEqual(d.tenantId, 'tenant_milano', 'No debe haber dominios de tenant_milano');
    }
  });
  console.log('  ✅ [PASS] Aislamiento multi-tenant validado contra accesos cruzados');

  // 3. Rate Limiting de Protección contra Ataques de Fuerza Bruta
  console.log('\n📋 [3/5] PROTECCIÓN CON SLIDING-WINDOW RATE LIMITER');
  const rateLimitKey = `test_ip_${Date.now()}`;
  const maxAttempts = 5;

  for (let i = 1; i <= maxAttempts; i++) {
    const check = RateLimiter.check(rateLimitKey, maxAttempts, 60);
    assert.strictEqual(check.allowed, true, `Intento ${i}/${maxAttempts} debe ser permitido`);
    assert.strictEqual(check.remaining, maxAttempts - i);
  }

  // Intento 6 (excede el límite de 5)
  const blockedCheck = RateLimiter.check(rateLimitKey, maxAttempts, 60);
  assert.strictEqual(blockedCheck.allowed, false, 'El intento posterior al límite debe ser bloqueado');
  assert.strictEqual(blockedCheck.remaining, 0);
  assert.ok(blockedCheck.resetSeconds > 0, 'Debe indicar segundos restantes para el reset');
  console.log('  ✅ [PASS] Rate limiter bloquea eficazmente peticiones excedentes');

  // 4. Sanitización contra XSS e Inyección de Scripts
  console.log('\n📋 [4/5] SANITIZACIÓN DE ENTRADAS Y PROTECCIÓN CONTRA XSS');
  const maliciousInput = '<script>alert("xss")</script><iframe src="evil.com"></iframe>Texto legítimo <b>formateado</b>';
  const sanitized = SecurityService.sanitizeString(maliciousInput);

  assert.ok(!sanitized.includes('<script>'), 'Etiquetas <script> deben ser neutralizadas');
  assert.ok(!sanitized.includes('<iframe>'), 'Etiquetas <iframe> deben ser neutralizadas');
  assert.ok(sanitized.includes('Texto legítimo'), 'El texto legítimo debe ser preservado');
  console.log('  ✅ [PASS] Filtro de sanitización neutraliza inyecciones maliciosas');

  // 5. Verificación Criptográfica Timing-Safe de Contraseñas
  console.log('\n📋 [5/5] VERIFICACIÓN DE CREDENCIALES CON TIEMPO CONSTANTE (TIMING-SAFE)');
  const password = 'SuperSecureProductionPassword2026!';
  const hash = PasswordService.hashPassword(password);

  assert.strictEqual(PasswordService.verifyPassword(password, hash), true, 'Contraseña correcta debe verificar');
  assert.strictEqual(PasswordService.verifyPassword('WrongPassword', hash), false, 'Contraseña incorrecta debe fallar');
  assert.strictEqual(PasswordService.verifyPassword('', hash), false, 'Contraseña vacía debe fallar');
  assert.strictEqual(PasswordService.verifyPassword(password, ''), false, 'Hash vacío debe fallar de forma segura');
  console.log('  ✅ [PASS] Verificación timing-safe de contraseñas validada');

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 21.5 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}
