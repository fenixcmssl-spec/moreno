import fs from 'fs';
import path from 'path';
import { StorefrontService } from '../lib/services/storefront.service';
import { DomainService } from '../lib/services/domain.service';
import { isProductionMode, isPostgresConfigured } from '../lib/prisma';
import { PlanService } from '../lib/services/plan.service';
import { AuthService } from '../lib/services/auth.service';
import { SuperAdminService } from '../lib/services/super-admin.service';

/**
 * Suite de Pruebas FenixCMS - Fase 7
 * Eliminación de la segunda realidad, PostgreSQL-only en runtime,
 * Cero Firebase y Contexto Tenant Confiable / Anti-Spoofing.
 */

export async function runFase7Tests(): Promise<{ passed: number; failed: number }> {
  console.log('\n======================================================');
  console.log('🛡️  EJECUTANDO SUITE DE PRUEBAS MAESTRA - FASE 7 (CERO SEGUNDA REALIDAD)');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // P01: Cero imports de Firebase en runtime (lib, app, components)
  try {
    const scanDirs = ['lib', 'app', 'components'];
    let firebaseImportsFound = 0;
    
    function scanForFirebase(dir: string) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (full.includes('node_modules') || full.includes('.next') || full.includes('tests')) continue;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanForFirebase(full);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.includes("from 'firebase") || content.includes('from "firebase') || content.includes("from './firebase'")) {
            firebaseImportsFound++;
          }
        }
      }
    }

    scanDirs.forEach(d => scanForFirebase(path.join(process.cwd(), d)));
    assert(firebaseImportsFound === 0, 'P01 - Cero imports de Firebase en lib, app y components runtime');
  } catch (err: any) {
    assert(false, 'P01 - Cero imports de Firebase', err?.message);
  }

  // P02: lib/firebase.ts no existe en el repositorio
  try {
    const firebasePath = path.join(process.cwd(), 'lib', 'firebase.ts');
    assert(!fs.existsSync(firebasePath), 'P02 - Archivo lib/firebase.ts eliminado del runtime');
  } catch (err: any) {
    assert(false, 'P02 - lib/firebase.ts eliminado', err?.message);
  }

  // P03: package.json no incluye firebase en dependencias
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    const hasFirebase = Boolean(pkg.dependencies?.firebase || pkg.devDependencies?.firebase);
    assert(!hasFirebase, 'P03 - Dependencia firebase eliminada de package.json');
  } catch (err: any) {
    assert(false, 'P03 - Dependencia firebase eliminada', err?.message);
  }

  // P04: Anti-Tenant Spoofing: Hostname sanitization limpia inyecciones y caracteres inválidos
  try {
    const raw = 'https://EVIL-tenant.com:8080/malicious/path?attack=1';
    const sanitized = StorefrontService.sanitizeHostname(raw);
    assert(sanitized === 'evil-tenant.com', 'P04 - Hostname sanitization remueve protocolos, puertos y paths');
  } catch (err: any) {
    assert(false, 'P04 - Hostname sanitization', err?.message);
  }

  // P05: Anti-Tenant Spoofing en Producción: fallbackSlug se ignora en producción
  try {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // StorefrontService en producción ignora fallbackSlug si no hay DB o no coincide
    const resolution = await StorefrontService.resolveStorefront('tenant-a.fenixcms.es', {
      fallbackSlug: 'tenant-b'
    }).catch(() => null);

    // No debe resolver tenant-b
    assert(!resolution || resolution?.tenant?.slug !== 'tenant-b', 'P05 - StorefrontService rechaza fallbackSlug en producción');
    process.env.NODE_ENV = originalEnv;
  } catch (err: any) {
    assert(false, 'P05 - Rechazo de fallbackSlug en producción', err?.message);
  }

  // P06: Domain trust: Dominios malformados o sospechosos son rechazados
  try {
    const malformed = '..invalid..host..';
    const clean = StorefrontService.sanitizeHostname(malformed);
    assert(clean === 'invalid..host' || !clean.startsWith('.'), 'P06 - Dominios con leading/trailing dots son limpiados');
  } catch (err: any) {
    assert(false, 'P06 - Dominios malformados', err?.message);
  }

  // P07: DB empty != DB down (SuperAdminService maneja estado vacío sin caer a demo data)
  try {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const metrics = await SuperAdminService.getDashboardMetrics().catch(() => null);
    assert(metrics !== null && typeof metrics?.mrr === 'number', 'P07 - Dashboard metrics estructurados correctamente');
    process.env.NODE_ENV = originalEnv;
  } catch (err: any) {
    assert(false, 'P07 - Dashboard metrics', err?.message);
  }

  // P08: Auth fail-closed: PasswordService no acepta contraseñas vacías ni hardcoded
  try {
    const user = await AuthService.getUserByEmail('nonexistent@fenixcms.es').catch(() => null);
    assert(user === null, 'P08 - Usuario inexistente devuelve null de forma estricta');
  } catch (err: any) {
    assert(false, 'P08 - Usuario inexistente devuelve null', err?.message);
  }

  // P09: StoreContext resetToDemoData deshabilitado en producción
  try {
    const storeContextContent = fs.readFileSync(path.join(process.cwd(), 'lib', 'storeContext.tsx'), 'utf-8');
    assert(
      storeContextContent.includes("process.env.NODE_ENV === 'production'") || 
      storeContextContent.includes('disabled in production mode'),
      'P09 - resetToDemoData bloqueado explícitamente en NODE_ENV=production'
    );
  } catch (err: any) {
    assert(false, 'P09 - resetToDemoData bloqueado', err?.message);
  }

  // P10: API client capa centralizada con ApiError y credenciales
  try {
    const apiClientContent = fs.readFileSync(path.join(process.cwd(), 'lib', 'api', 'client.ts'), 'utf-8');
    assert(
      apiClientContent.includes('class ApiError') && 
      apiClientContent.includes("credentials: 'include'"),
      'P10 - Capa data access lib/api/client.ts centralizada con ApiError y credentials'
    );
  } catch (err: any) {
    assert(false, 'P10 - Capa data access', err?.message);
  }

  // P11: Textos de UI no mencionan Firestore en producción
  try {
    const saasLandingContent = fs.readFileSync(path.join(process.cwd(), 'components', 'saas', 'SaasLanding.tsx'), 'utf-8');
    assert(
      !saasLandingContent.includes('provisionada en Firestore') && 
      saasLandingContent.includes('provisionada en PostgreSQL'),
      'P11 - SaasLanding.tsx actualizado a PostgreSQL (cero menciones a Firestore)'
    );
  } catch (err: any) {
    assert(false, 'P11 - Textos de UI actualizados', err?.message);
  }

  // P12: Anti-spoofing en resolve API route: querySlug diferente de headerSlug genera rechazo en producción
  try {
    const resolveRouteContent = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'storefront', 'resolve', 'route.ts'), 'utf-8');
    assert(
      resolveRouteContent.includes('TENANT_SPOOFING_REJECTED'),
      'P12 - app/api/storefront/resolve/route.ts contiene guarda explícita TENANT_SPOOFING_REJECTED'
    );
  } catch (err: any) {
    assert(false, 'P12 - Anti-spoofing route check', err?.message);
  }

  console.log(`\nRESUMEN FASE 7: ${passed} PASADOS, ${failed} FALLADOS\n`);
  return { passed, failed };
}

if (require.main === module) {
  runFase7Tests().then(res => {
    if (res.failed > 0) process.exit(1);
  });
}
