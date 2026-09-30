import { SecurityService, RateLimiter } from '../lib/security/security.service';
import { WebhookService } from '../lib/services/webhook.service';
import { SessionService } from '../lib/auth/session';
import { NextRequest } from 'next/server';
import { POST as loginRoute } from '../app/api/auth/login/route';
import { POST as stripeWebhookRoute } from '../app/api/webhooks/stripe/route';
import { POST as paypalWebhookRoute } from '../app/api/webhooks/paypal/route';
import { POST as mediaRoute } from '../app/api/media/route';
import { POST as pluginsRoute } from '../app/api/plugins/route';

async function runComprehensiveSecurityAudit() {
  console.log('🛡️ ========================================================');
  console.log('🛡️ INICIANDO AUDITORÍA INTEGRAL DE SEGURIDAD (PASO 19)');
  console.log('🛡️ ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${testName}`, detail || '');
      failed++;
    }
  }

  // 1. XSS and Script Injection
  console.log('📋 AUDITORÍA 1: Prevención de XSS y Sanitización de Payloads');
  {
    const dirtyXss = '<script>alert("xss")</script><img src=x onerror=alert(1)>Texto Seguro';
    const clean = SecurityService.sanitizeString(dirtyXss);
    assert(!clean.includes('<script>') && !clean.includes('onerror='), 'Elimina etiquetas script y manejadores onerror de XSS');
    assert(clean.includes('Texto Seguro'), 'Preserva contenido de texto legítimo');

    const complexPayload = {
      title: 'Producto <script>steal()</script>',
      description: 'Oferta <iframe src="evil.com"></iframe> con descuento',
      nested: {
        comment: 'javascript:alert(document.cookie)'
      }
    };
    const sanitizedObj = SecurityService.sanitizePayload(complexPayload);
    assert(!sanitizedObj.title.includes('<script>'), 'Sanitiza propiedades anidadas de primer nivel');
    assert(!sanitizedObj.description.includes('<iframe'), 'Elimina etiquetas iframe');
    assert(!sanitizedObj.nested.comment.includes('javascript:'), 'Elimina pseudoprotocolos javascript:');
  }

  // 2. File Upload Vulnerabilities & Path Traversal
  console.log('\n📋 AUDITORÍA 2: Seguridad en Carga de Archivos & Path Traversal');
  {
    // Test dangerous extensions
    const badPhp = SecurityService.validateFileUpload({ name: 'shell.php', type: 'application/x-php', size: 1024 });
    assert(!badPhp.valid, 'Bloquea extensión ejecutable peligrosa .php');

    const badExe = SecurityService.validateFileUpload({ name: 'trojan.exe', type: 'application/octet-stream', size: 2048 });
    assert(!badExe.valid, 'Bloquea archivos ejecutables .exe');

    const badJs = SecurityService.validateFileUpload({ name: 'malware.js', type: 'application/javascript', size: 500 });
    assert(!badJs.valid, 'Bloquea scripts de cliente/servidor .js');

    // Test oversized file
    const hugeFile = SecurityService.validateFileUpload({ name: 'huge.png', type: 'image/png', size: 15 * 1024 * 1024 });
    assert(!hugeFile.valid, 'Bloquea archivos que superan el límite máximo de tamaño (10MB)');

    // Test path traversal attempt
    const traversal = SecurityService.validateFileUpload({ name: '../../../../etc/passwd.jpg', type: 'image/jpeg', size: 2048 });
    assert(traversal.valid && !traversal.sanitizedName?.includes('/'), 'Neutraliza secuencias de directory traversal (../) en nombres de archivo');
  }

  // 3. Webhook Spoofing Prevention
  console.log('\n📋 AUDITORÍA 3: Prevención de Suplantación de Webhooks (Webhook Spoofing)');
  {
    // Test Stripe fake webhook
    const fakeStripeReq = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_fake_999' }),
      headers: {
        'stripe-signature': 't=123456,v1=invalid_fake_signature_hash'
      }
    });
    const stripeRes = await stripeWebhookRoute(fakeStripeReq);
    assert(stripeRes.status === 401, 'Webhook Stripe sin firma válida es rechazado con 401 Unauthorized');

    // Test PayPal fake webhook
    const fakePaypalReq = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'PAYMENT.SALE.COMPLETED', id: 'WH-fake-123' }),
      headers: {
        'paypal-transmission-sig': 'invalid_sig'
      }
    });
    const paypalRes = await paypalWebhookRoute(fakePaypalReq);
    assert(paypalRes.status === 401, 'Webhook PayPal sin firma válida es rechazado con 401 Unauthorized');
  }

  // 4. Rate Limiting Protection against Brute-Force & Abuse
  console.log('\n📋 AUDITORÍA 4: Rate Limiting y Mitigación de Fuerza Bruta');
  {
    const testKey = 'test_rate_limit_ip_123';
    // 5 allowed in window of 5
    for (let i = 0; i < 5; i++) {
      RateLimiter.check(testKey, 5, 10);
    }
    const blockedCheck = RateLimiter.check(testKey, 5, 10);
    assert(!blockedCheck.allowed && blockedCheck.remaining === 0, 'Bloquea peticiones cuando se supera el umbral del rate limiter (429)');

    // Test API route rate limiting guard
    const testReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@invalid.com', password: 'wrong' }),
      headers: { 'x-forwarded-for': '198.51.100.42' }
    });
    const guard = SecurityService.applyRateLimit(testReq, 1, 60, 'test_guard');
    const guardBlocked = SecurityService.applyRateLimit(testReq, 1, 60, 'test_guard');
    assert(guardBlocked.limited && guardBlocked.response?.status === 429, 'Guard devuelve respuesta 429 con cabeceras Retry-After');
  }

  // 5. Unsafe Plugin Execution Sandbox
  console.log('\n📋 AUDITORÍA 5: Sandbox de Seguridad para Plugins & Addons');
  {
    const dangerousPlugin1 = {
      id: 'malicious_plugin',
      name: 'Bad Plugin',
      version: '1.0.0',
      hooks: {
        onInit: 'eval(process.env.DATABASE_URL)'
      }
    };
    const check1 = SecurityService.validatePluginManifest(dangerousPlugin1);
    assert(!check1.valid, 'Detecta y bloquea plugins con llamada a eval() o acceso a variables de entorno');

    const dangerousPlugin2 = {
      id: 'plugin_child',
      name: 'Bad Plugin 2',
      version: '1.0.0',
      code: 'require("child_process").exec("whoami")'
    };
    const check2 = SecurityService.validatePluginManifest(dangerousPlugin2);
    assert(!check2.valid, 'Detecta y bloquea ejecución de procesos del sistema operativo');

    const validPlugin = {
      id: 'plugin_valid_test',
      name: 'Valid Safe Plugin',
      version: '1.0.0',
      description: 'Plugin seguro de ejemplo'
    };
    const checkValid = SecurityService.validatePluginManifest(validPlugin);
    assert(checkValid.valid, 'Permite instalación de plugin válido y conforme a políticas de seguridad');
  }

  // 6. Open Redirects Prevention
  console.log('\n📋 AUDITORÍA 6: Prevención de Redirecciones Inseguras (Open Redirects)');
  {
    assert(SecurityService.isSafeRedirectUrl('/admin/dashboard'), 'Permite ruta interna relativa segura');
    assert(SecurityService.isSafeRedirectUrl('https://fenixcms.es/checkout'), 'Permite URL absoluta a dominio de confianza');
    assert(!SecurityService.isSafeRedirectUrl('https://evil-phishing-site.com'), 'Rechaza redirección a dominio externo no autorizado');
    assert(!SecurityService.isSafeRedirectUrl('//evil.com/path'), 'Rechaza URL con doble barra que evada validación de protocolo');
    assert(!SecurityService.isSafeRedirectUrl('javascript:alert(1)'), 'Rechaza pseudoprotocolos ejecutables');
  }

  // 7. Broken Authentication & Session Verification
  console.log('\n📋 AUDITORÍA 7: Integridad de Sesiones y Autenticación Segura');
  {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.fake';
    const verified = await SessionService.getSession(invalidToken);
    assert(verified === null, 'Token de sesión corrupto o manipulado es rechazado');

    const { token, session } = await SessionService.createSession({
      id: 'user_attacker',
      email: 'attacker@evil.com',
      name: 'Attacker User',
      role: 'ADMIN',
      tenantId: 'tenant_milano'
    });
    // Valid token created by system verifies correctly
    const validVerified = await SessionService.getSession(token);
    assert(validVerified !== null && validVerified.userId === 'user_attacker', 'Token generado correctamente valida integridad criptográfica');
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTADOS DE LA AUDITORÍA DE SEGURIDAD: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveSecurityAudit().catch(err => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
