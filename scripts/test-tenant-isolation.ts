import { NextRequest } from 'next/server';
import { TenantContextHelper } from '../lib/auth/tenantContext';
import { SessionService } from '../lib/auth/session';
import { GET as getProducts, DELETE as deleteProduct } from '../app/api/products/route';
import { GET as getOrders } from '../app/api/orders/route';
import { GET as getInvoices } from '../app/api/billing/invoices/route';
import { GET as getMedia } from '../app/api/media/route';
import { PUT as updateTenant } from '../app/api/tenants/route';

async function runIsolationTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 INICIANDO SUITE DE PRUEBAS DE AISLAMIENTO MULTI-TENANT');
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

  // 1. Setup Mock Sessions for Tenant Demo and Tenant Milano
  const sessionTenantDemo = await SessionService.createSession({
    id: 'user_merchant_demo',
    email: 'admin@tienda-demo.es',
    name: 'Admin Tienda Demo',
    role: 'ADMIN',
    tenantId: 'tenant_demo',
    tenantSlug: 'tienda-demo'
  });

  const sessionTenantMilano = await SessionService.createSession({
    id: 'user_merchant_milano',
    email: 'admin@milanostyle.it',
    name: 'Admin Milano Style',
    role: 'ADMIN',
    tenantId: 'tenant_milano',
    tenantSlug: 'milanostyle'
  });

  const sessionSuperAdmin = await SessionService.createSession({
    id: 'user_super_admin',
    email: 'info@fenixcms.es',
    name: 'Super Admin',
    role: 'SUPER_ADMIN'
  });

  console.log('📋 CASO 1: Tenant Demo intenta leer productos de Tenant Milano');
  {
    const req = new NextRequest('http://localhost:3000/api/products?tenantId=tenant_milano', {
      headers: {
        'cookie': `fenix_session_token=${sessionTenantDemo.token}`
      }
    });

    const res = await getProducts(req);
    const data = await res.json();

    assert(
      res.status === 403 && data.code === 'TENANT_FORBIDDEN',
      'Tenant Demo recibe 403 FORBIDDEN al solicitar productos de Tenant Milano',
      { status: res.status, data }
    );
  }

  console.log('\n📋 CASO 2: Tenant Demo intenta leer pedidos de Tenant Milano');
  {
    const req = new NextRequest('http://localhost:3000/api/orders?tenantId=tenant_milano', {
      headers: {
        'cookie': `fenix_session_token=${sessionTenantDemo.token}`
      }
    });

    const res = await getOrders(req);
    const data = await res.json();

    assert(
      res.status === 403 && data.code === 'TENANT_FORBIDDEN',
      'Tenant Demo recibe 403 FORBIDDEN al intentar consultar pedidos de Tenant Milano',
      { status: res.status, data }
    );
  }

  console.log('\n📋 CASO 3: Tenant Demo intenta ver facturación/invoices de Tenant Milano');
  {
    const req = new NextRequest('http://localhost:3000/api/billing/invoices?tenantId=tenant_milano', {
      headers: {
        'cookie': `fenix_session_token=${sessionTenantDemo.token}`
      }
    });

    const res = await getInvoices(req);
    const data = await res.json();

    assert(
      res.status === 403 && data.code === 'TENANT_FORBIDDEN',
      'Tenant Demo recibe 403 FORBIDDEN al intentar acceder a facturas de Tenant Milano',
      { status: res.status, data }
    );
  }

  console.log('\n📋 CASO 4: Tenant Demo intenta modificar ajustes de Tenant Milano');
  {
    const req = new NextRequest('http://localhost:3000/api/tenants', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'cookie': `fenix_session_token=${sessionTenantDemo.token}`
      },
      body: JSON.stringify({
        tenantId: 'tenant_milano',
        settings: { storeName: 'HACKED STORE' }
      })
    });

    const res = await updateTenant(req);
    const data = await res.json();

    assert(
      res.status === 403 && data.code === 'TENANT_FORBIDDEN',
      'Tenant Demo recibe 403 FORBIDDEN al intentar modificar la configuración de Tenant Milano',
      { status: res.status, data }
    );
  }

  console.log('\n📋 CASO 5: Tenant Demo accede a sus propios recursos legítimos');
  {
    const req = new NextRequest('http://localhost:3000/api/products?tenantId=tenant_demo', {
      headers: {
        'cookie': `fenix_session_token=${sessionTenantDemo.token}`
      }
    });

    const res = await getProducts(req);
    const data = await res.json();

    assert(
      res.status === 200 && Array.isArray(data.products),
      'Tenant Demo puede leer sus propios productos con 200 OK',
      { status: res.status, total: data.total }
    );
  }

  console.log('\n📋 CASO 6: Super Admin tiene acceso transversal autorizado para soporte');
  {
    const req = new NextRequest('http://localhost:3000/api/products?tenantId=tenant_milano', {
      headers: {
        'cookie': `fenix_session_token=${sessionSuperAdmin.token}`
      }
    });

    const res = await getProducts(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.tenantId === 'tenant_milano',
      'Super Admin puede acceder a los productos de cualquier tenant con 200 OK',
      { status: res.status, tenantId: data.tenantId }
    );
  }

  console.log('\n📋 CASO 7: Petición pública de Storefront no autenticada');
  {
    const req = new NextRequest('http://localhost:3000/api/products', {
      headers: {
        'x-forwarded-host': 'milano.fenixcms.es'
      }
    });

    const res = await getProducts(req);
    const data = await res.json();

    assert(
      res.status === 200 && data.tenantId === 'tenant_milano',
      'Storefront público resuelve automáticamente el tenant correcto por Host header sin aceptar forja de tenantId',
      { status: res.status, tenantId: data.tenantId }
    );
  }

  console.log('\n========================================================');
  console.log(`📊 RESULTADOS DE LAS PRUEBAS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIsolationTests().catch(err => {
  console.error('Error fatal ejecutando pruebas de aislamiento:', err);
  process.exit(1);
});
