import { TenantContextHelper } from '../lib/auth/tenantContext';
import { DatabaseConfigurationError, isPostgresConfigured } from '../lib/prisma';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runFase24Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 24 — RESOLUCIÓN DE TENANT POR CONTEXTO CONFIABLE');
  console.log('================================================================================');

  const originalEnv = process.env.NODE_ENV;
  const originalSim = process.env.ALLOW_DEV_TENANT_SIMULATION;

  try {
    // -------------------------------------------------------------------------
    // 1. Regla de Producción: Fail-Fast sin PostgreSQL
    // -------------------------------------------------------------------------
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEV_TENANT_SIMULATION;

    console.log('\n📋 [1/5] REGLA DE PRODUCCIÓN: FAIL-FAST SI NO HAY POSTGRESQL');
    {
      const req = new NextRequest('https://tienda-demo.fenixcms.es/api/products', {
        headers: {
          host: 'tienda-demo.fenixcms.es',
          'x-resolved-hostname': 'tienda-demo.fenixcms.es',
          'x-tenant-slug': 'tienda-demo'
        }
      });

      if (!isPostgresConfigured()) {
        let threw = false;
        try {
          await TenantContextHelper.resolvePublicTenant(req);
        } catch (e) {
          threw = e instanceof DatabaseConfigurationError;
        }
        assert(threw, 'En producción sin DATABASE_URL, lanza DatabaseConfigurationError explícito (fail-fast)');
      } else {
        const ctx = await TenantContextHelper.resolvePublicTenant(req);
        assert(ctx !== null && ctx.tenant.slug === 'tienda-demo', 'Resuelve tenant legítimo desde PostgreSQL');
      }
    }

    // -------------------------------------------------------------------------
    // 2. Modo Desarrollo con simulación desactivada (Modo seguro por defecto)
    // -------------------------------------------------------------------------
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_DEV_TENANT_SIMULATION;

    console.log('\n📋 [2/5] RESOLUCIÓN: DOMINIO INEXISTENTE');
    {
      const req = new NextRequest('https://dominio-ficticio-que-no-existe.es/api/products', {
        headers: {
          host: 'dominio-ficticio-que-no-existe.es',
          'x-resolved-hostname': 'dominio-ficticio-que-no-existe.es'
        }
      });

      const ctx = await TenantContextHelper.resolvePublicTenant(req);
      assert(ctx === null, 'Dominio no registrado devuelve null (fail-closed) y NO selecciona tenant demo por defecto');
    }

    console.log('\n📋 [3/5] RECHAZO DE QUERY PARAMETERS SIN BANDERA DE SIMULACIÓN');
    {
      // Intentar secuestrar el tenant mediante query parameter
      const req = new NextRequest('https://fenixcms.es/api/products?tenant=tienda-demo&store=tienda-demo', {
        headers: {
          host: 'fenixcms.es',
          'x-resolved-hostname': 'fenixcms.es'
        }
      });

      const ctx = await TenantContextHelper.resolvePublicTenant(req);
      assert(ctx === null, 'Sin bandera de simulación, los query params no pueden forzar la autoridad de un tenant');
    }

    console.log('\n📋 [4/5] RESOLUCIÓN POR DOMINIO VERIFICADO');
    {
      const req = new NextRequest('https://tienda-demo.fenixcms.es/api/products', {
        headers: {
          host: 'tienda-demo.fenixcms.es',
          'x-resolved-hostname': 'tienda-demo.fenixcms.es',
          'x-tenant-slug': 'tienda-demo'
        }
      });

      const ctx = await TenantContextHelper.resolvePublicTenant(req);
      assert(ctx !== null, 'Resuelve exitosamente tenant con dominio/slug verificado');
      assert(ctx?.tenant?.slug === 'tienda-demo', 'Tenant resuelto coincide con el subdominio legítimo');
      assert(ctx?.resolvedVia === 'domain', 'Tipo de resolución es domain');
    }

    console.log('\n📋 [5/5] MEZCLA DE HOST REAL + QUERY DE OTRO TENANT');
    {
      // Petición a tenant_demo intentando inyectar query ?store=tenant_milano
      const req = new NextRequest('https://tienda-demo.fenixcms.es/api/products?store=milanostyle', {
        headers: {
          host: 'tienda-demo.fenixcms.es',
          'x-resolved-hostname': 'tienda-demo.fenixcms.es',
          'x-tenant-slug': 'tienda-demo'
        }
      });

      const ctx = await TenantContextHelper.resolvePublicTenant(req);
      assert(ctx !== null, 'Resuelve tenant por el host verificado');
      assert(ctx?.tenant?.slug === 'tienda-demo', 'El host verificado prevalece estrictamente sobre cualquier query param falso');
    }

    console.log('\n================================================================================');
    console.log('🎉 TODOS LOS TESTS DE LA FASE 24 COMPLETADOS CON ÉXITO');
    console.log('================================================================================\n');
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalSim !== undefined) {
      process.env.ALLOW_DEV_TENANT_SIMULATION = originalSim;
    }
  }
}

// Ejecución directa si se invoca con tsx/node
if (require.main === module) {
  runFase24Tests().catch(err => {
    console.error('Error en suite FASE 24:', err);
    process.exit(1);
  });
}
