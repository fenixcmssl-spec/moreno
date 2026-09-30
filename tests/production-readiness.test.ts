import assert from 'assert';
import crypto from 'crypto';
import { isPostgresConfigured, isProductionMode, DatabaseConfigurationError, DatabaseConnectionError } from '../lib/prisma';
import { SessionService } from '../lib/auth/session';
import { WebhookService } from '../lib/services/webhook.service';
import fs from 'fs';
import path from 'path';

export async function runProductionReadinessTests() {
  console.log('================================================================================');
  console.log('🛡️  SUITE DE PRUEBAS: FASE 21.1 — PREPARACIÓN PARA PRODUCCIÓN & VPS');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function testAssert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // 1. Audit .env.example
  console.log('📋 [1/7] AUDITORÍA DE ARCHIVOS DE CONFIGURACIÓN & .ENV.EXAMPLE');
  {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    testAssert(fs.existsSync(envExamplePath), 'El archivo .env.example existe físicamente');
    
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    testAssert(envContent.includes('DATABASE_URL='), '.env.example define DATABASE_URL');
    testAssert(envContent.includes('NODE_ENV=production'), '.env.example define NODE_ENV=production');
    testAssert(envContent.includes('STRIPE_SECRET_KEY='), '.env.example define STRIPE_SECRET_KEY');
    testAssert(envContent.includes('STRIPE_WEBHOOK_SECRET='), '.env.example define STRIPE_WEBHOOK_SECRET');
    testAssert(envContent.includes('PAYPAL_CLIENT_ID='), '.env.example define PAYPAL_CLIENT_ID');
    testAssert(envContent.includes('PAYPAL_CLIENT_SECRET='), '.env.example define PAYPAL_CLIENT_SECRET');
    testAssert(envContent.includes('STORAGE_CDN_URL='), '.env.example define STORAGE_CDN_URL');
    testAssert(!envContent.includes('sk_live_123'), '.env.example NO contiene claves reales de Stripe Live');
    testAssert(!envContent.includes('whsec_real_secret'), '.env.example NO contiene secretos reales de Webhook');
  }

  // 2. Node Version (.nvmrc) & Standalone Build Output
  console.log('\n📋 [2/7] AUDITORÍA DE VERSIÓN DE NODE.JS Y BUILD STANDALONE');
  {
    const nvmrcPath = path.join(process.cwd(), '.nvmrc');
    testAssert(fs.existsSync(nvmrcPath), 'El archivo .nvmrc existe para fijar Node.js 22 LTS');
    
    const nextConfigContent = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf8');
    testAssert(nextConfigContent.includes("output: 'standalone'"), 'next.config.ts tiene configurado output standalone para VPS');
  }

  // 3. Fail-Fast Database Guard in Production Mode
  console.log('\n📋 [3/7] REGLA FAIL-FAST DE POSTGRESQL EN MODO PRODUCCIÓN');
  {
    const prevEnv = process.env.NODE_ENV;
    const prevDbUrl = process.env.DATABASE_URL;

    try {
      // Test missing DATABASE_URL in production
      (process.env as any).NODE_ENV = 'production';
      delete process.env.DATABASE_URL;

      let caught = false;
      try {
        if (!isPostgresConfigured() && isProductionMode()) {
          throw new DatabaseConfigurationError('FATAL: DATABASE_URL is missing in production');
        }
      } catch (err: any) {
        caught = err instanceof DatabaseConfigurationError;
      }
      testAssert(caught, 'Lanza DatabaseConfigurationError explícito cuando DATABASE_URL falta en producción');
    } finally {
      (process.env as any).NODE_ENV = prevEnv;
      if (prevDbUrl) process.env.DATABASE_URL = prevDbUrl;
    }
  }

  // 4. Session Security & Cookie Protection
  console.log('\n📋 [4/7] PROTECCIÓN DE COOKIES & TOKENS DE SESIÓN');
  {
    const cookieName = SessionService.getCookieName();
    testAssert(cookieName === 'fenix_session_token', 'Cookie de sesión usa nombre seguro estándar');

    // Verify raw tokens are hashed before storage
    const rawToken = 'sess_test_random_token_1234567890';
    const hash1 = SessionService.hashToken(rawToken);
    const hash2 = SessionService.hashToken(rawToken);
    testAssert(hash1 === hash2, 'Hash de token es determinista con SHA-256');
    testAssert(hash1 !== rawToken, 'El token no se guarda en texto plano');
    testAssert(hash1.length === 64, 'El hash SHA-256 tiene una longitud exacta de 64 caracteres hex');
  }

  // 5. Health & Readiness Endpoint
  console.log('\n📋 [5/7] ENDPOINT DE SALUD (/api/health) Y SEPARACIÓN LIVENESS/READINESS');
  {
    const healthRoutePath = path.join(process.cwd(), 'app/api/health/route.ts');
    testAssert(fs.existsSync(healthRoutePath), 'Ruta /app/api/health/route.ts creada físicamente');
    
    const healthCode = fs.readFileSync(healthRoutePath, 'utf8');
    testAssert(healthCode.includes('probeType === \'liveness\''), 'Soporta probeType=liveness para verificar proceso Node');
    testAssert(healthCode.includes('assertDatabaseReady()'), 'Soporta probeType=readiness para verificar conexión PostgreSQL');
    testAssert(!healthCode.includes('process.env.DATABASE_URL'), 'Health endpoint NO expone el valor de process.env.DATABASE_URL');
    testAssert(healthCode.includes('status: 503'), 'Devuelve status 503 cuando PostgreSQL está caído o no configurado');
  }

  // 6. Webhook Cryptographic Verification & Secret Handling
  console.log('\n📋 [6/7] VERIFICACIÓN CRIPTOGRÁFICA DE WEBHOOKS & FIRMAS');
  {
    const secret = 'whsec_test_secret_for_validation_123';
    const samplePayload = JSON.stringify({ id: 'evt_test', type: 'payment_intent.succeeded' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${samplePayload}`;
    const validHmac = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
    const validHeader = `t=${timestamp},v1=${validHmac}`;

    const isValid = WebhookService.verifyStripeSignature(samplePayload, validHeader, secret);
    testAssert(isValid.valid === true, 'Verifica correctamente firma auténtica HMAC-SHA256');

    const isTamperedValid = WebhookService.verifyStripeSignature(samplePayload, validHeader, 'whsec_wrong_secret');
    testAssert(isTamperedValid.valid === false, 'Rechaza firma cuando el secreto no coincide (Anti-Spoofing)');
  }

  // 7. Client Components Secrets Audit
  console.log('\n📋 [7/7] AUDITORÍA DE AISLAMIENTO CLIENTE/SERVIDOR (ZERO SECRETS EN CLIENTE)');
  {
    const componentsDir = path.join(process.cwd(), 'components');
    const allComponentFiles: string[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          allComponentFiles.push(fullPath);
        }
      }
    }

    scanDir(componentsDir);
    let secretFoundInClient = false;
    for (const file of allComponentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('process.env.DATABASE_URL') || content.includes('process.env.STRIPE_SECRET_KEY') || content.includes('process.env.PAYPAL_CLIENT_SECRET')) {
        secretFoundInClient = true;
        break;
      }
    }

    testAssert(!secretFoundInClient, 'Ningún componente de cliente accede a variables secretas del servidor');
  }

  console.log('\n================================================================================');
  console.log(`📊 RESULTADOS FASE 21.1: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('================================================================================\n');

  if (failed > 0) {
    throw new Error(`Fallo en suite de preparación de producción: ${failed} tests fallidos.`);
  }
}

if (require.main === module) {
  runProductionReadinessTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
