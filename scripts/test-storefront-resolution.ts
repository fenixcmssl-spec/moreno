import { StorefrontService } from '../lib/services/storefront.service';
import { NextRequest } from 'next/server';
import { GET as resolveStorefrontApi } from '../app/api/storefront/resolve/route';

async function runStorefrontResolutionTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS DE RESOLUCIÓN DE STOREFRONT');
  console.log('🧪 ========================================================\n');

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

  // TEST 1: Sanitización de Host headers
  console.log('📋 CASO 1: Sanitización de Host headers y prevención de inyección');
  {
    const sanitized1 = StorefrontService.sanitizeHostname('https://CLIENTE.COM:3000/path?query=1');
    assert(sanitized1 === 'cliente.com', 'Sanitiza URL con protocolo, puerto y path');

    const sanitized2 = StorefrontService.sanitizeHostname('evil.com\r\nInjected-Header: evil');
    assert(!sanitized2.includes('\r') && !sanitized2.includes('\n'), 'Elimina caracteres CRLF de inyección');

    const sanitized3 = StorefrontService.sanitizeHostname('  cliente.fenixcms.es/admin  ');
    assert(sanitized3 === 'cliente.fenixcms.es', 'Elimina espacios y paths secundarios');
  }

  // TEST 2: Resolución de Tenant A por dominio personalizado (cliente.com / tienda-demo.es)
  console.log('\n📋 CASO 2: Resolución de Tenant A por Dominio Personalizado (cliente.com)');
  {
    const req = new NextRequest('http://localhost:3000/api/storefront/resolve?host=cliente.com');
    const res = await resolveStorefrontApi(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.success === true,
      'Endpoint /api/storefront/resolve responde 200 OK para cliente.com',
      { status: res.status }
    );
    assert(
      data.tenant?.id === 'tenant_demo' && data.tenant?.slug === 'tienda-demo',
      'Resuelve exactamente el Tenant A (tenant_demo)',
      { tenant: data.tenant?.name }
    );
    assert(
      data.theme && data.settings && data.language,
      'Devuelve configuración completa: Theme, Settings y Language',
      { theme: data.theme?.id, defaultLocale: data.language?.defaultLocale }
    );
    assert(
      Array.isArray(data.products) && data.products.length > 0,
      'Devuelve catálogo de productos de Tenant A',
      { totalProducts: data.products?.length }
    );
  }

  // TEST 3: Resolución de Tenant A por subdominio (cliente.fenixcms.es / demo.fenixcms.es)
  console.log('\n📋 CASO 3: Resolución de Tenant A por Subdominio (cliente.fenixcms.es)');
  {
    const req = new NextRequest('http://localhost:3000/api/storefront/resolve?host=cliente.fenixcms.es');
    const res = await resolveStorefrontApi(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.tenant?.id === 'tenant_demo',
      'cliente.fenixcms.es resuelve con éxito Tenant A (tenant_demo)',
      { status: res.status, tenantId: data.tenant?.id }
    );
  }

  // TEST 4: Resolución de Tenant B por dominio personalizado (milanostyle.it)
  console.log('\n📋 CASO 4: Resolución de Tenant B por Dominio Personalizado (milanostyle.it)');
  {
    const req = new NextRequest('http://localhost:3000/api/storefront/resolve?host=milanostyle.it');
    const res = await resolveStorefrontApi(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.success === true,
      'Endpoint /api/storefront/resolve responde 200 OK para milanostyle.it',
      { status: res.status }
    );
    assert(
      data.tenant?.id === 'tenant_milano' && data.tenant?.slug === 'milanostyle',
      'Resuelve exactamente el Tenant B (tenant_milano)',
      { tenant: data.tenant?.name }
    );
    assert(
      data.tenant?.defaultLocale === 'it',
      'Resuelve la configuración regional propia de Tenant B (Italiano / it)',
      { locale: data.tenant?.defaultLocale }
    );
  }

  // TEST 5: Resolución de Tenant B por subdominio (milano.fenixcms.es)
  console.log('\n📋 CASO 5: Resolución de Tenant B por Subdominio (milano.fenixcms.es)');
  {
    const req = new NextRequest('http://localhost:3000/api/storefront/resolve?host=milano.fenixcms.es');
    const res = await resolveStorefrontApi(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.tenant?.id === 'tenant_milano',
      'milano.fenixcms.es resuelve con éxito Tenant B (tenant_milano)',
      { status: res.status, tenantId: data.tenant?.id }
    );
  }

  // TEST 6: Verificación de Aislamiento y Ausencia de Fuga de Datos (Isolation Audit)
  console.log('\n📋 CASO 6: Auditoría de Aislamiento Estricto entre Tenant A y Tenant B');
  {
    // Payload Tenant A
    const reqA = new NextRequest('http://localhost:3000/api/storefront/resolve?host=tienda-demo.es');
    const resA = await resolveStorefrontApi(reqA);
    const dataA = await resA.json();

    // Payload Tenant B
    const reqB = new NextRequest('http://localhost:3000/api/storefront/resolve?host=milanostyle.it');
    const resB = await resolveStorefrontApi(reqB);
    const dataB = await resB.json();

    // Comprobar que ningún producto de A tiene tenantId de B y viceversa
    const leakInA = dataA.products.some((p: any) => p.tenantId === 'tenant_milano');
    const leakInB = dataB.products.some((p: any) => p.tenantId === 'tenant_demo');

    assert(!leakInA, 'Tenant A NO contiene ningún producto o dato de Tenant B');
    assert(!leakInB, 'Tenant B NO contiene ningún producto o dato de Tenant A');

    // Comprobar aislamiento de Theme y Branding
    assert(
      dataA.tenant.id !== dataB.tenant.id,
      'Los IDs y metadatos de tenant están estrictamente separados'
    );
  }

  // TEST 7: Dominio Desconocido devuelve 404
  console.log('\n📋 CASO 7: Petición con Dominio No Registrado');
  {
    const req = new NextRequest('http://localhost:3000/api/storefront/resolve?host=tienda-inexistente-xyz999.com');
    const res = await resolveStorefrontApi(req);
    const data = await res.json();

    assert(
      res.status === 404 && data.code === 'STOREFRONT_NOT_FOUND',
      'Dominio inexistente responde 404 STOREFRONT_NOT_FOUND sin fuga de datos por defecto',
      { status: res.status, code: data.code }
    );
  }

  // TEST 8: Validación de Cache con Partición Estricta
  console.log('\n📋 CASO 8: Validación de Cache Particionado y Aislamiento');
  {
    // Primer hit (pobla cache)
    const payload1 = await StorefrontService.resolveStorefront('cliente.com');
    // Segundo hit (desde cache)
    const payload2 = await StorefrontService.resolveStorefront('cliente.com');

    assert(
      payload1?.tenant.id === payload2?.tenant.id && payload2?.tenant.id === 'tenant_demo',
      'Cache recupera correctamente la partición sin mezclar contextos'
    );

    // Invalida cache de Tenant A
    StorefrontService.invalidateTenantCache('tenant_demo');
    const payload3 = await StorefrontService.resolveStorefront('cliente.com');
    assert(payload3?.tenant.id === 'tenant_demo', 'Invalidación y re-resolución de cache operan de forma limpia');
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTADOS DE LAS PRUEBAS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStorefrontResolutionTests().catch(err => {
  console.error('Error fatal ejecutando pruebas de resolución:', err);
  process.exit(1);
});
