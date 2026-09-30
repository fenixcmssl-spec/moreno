import { 
  executeTenantIsolationGuard, 
  TenantIsolationViolationError, 
  TENANT_SCOPED_MODELS 
} from '../lib/prisma';
import { runWithTenant, runWithSystemContext } from '../lib/auth/tenantContext';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runFase25Tests() {
  console.log('================================================================================');
  console.log('🧪 SUITE DE PRUEBAS: FASE 25 — PRISMA FAIL-CLOSED PARA AISLAMIENTO MULTI-TENANT');
  console.log('================================================================================');

  console.log('\n📋 [1/5] RECHAZO AUTOMÁTICO (FAIL-CLOSED) EN AUSENCIA DE CONTEXTO TENANT');
  {
    let threw = false;
    try {
      await executeTenantIsolationGuard({
        model: 'Product',
        operation: 'findMany',
        args: { where: { status: 'active' } },
        query: async () => []
      });
    } catch (err) {
      threw = err instanceof TenantIsolationViolationError;
    }
    assert(threw, 'Operación tenant-scoped sin activeTenantId y sin bypass es rechazada con TenantIsolationViolationError');
  }

  console.log('\n📋 [2/5] CONTEXTO TENANT VÁLIDO: INYECCIÓN AUTOMÁTICA DE TENANTID');
  {
    let interceptedArgs: any = null;
    await runWithTenant('tenant_demo_abc', async () => {
      await executeTenantIsolationGuard({
        model: 'Product',
        operation: 'findMany',
        args: { where: { status: 'active' } },
        query: async (args: any) => {
          interceptedArgs = args;
          return [];
        }
      });
    });

    assert(interceptedArgs !== null, 'Operación con contexto tenant es ejecutada');
    assert(interceptedArgs.where.tenantId === 'tenant_demo_abc', 'tenantId es inyectado deterministamente en el query');
  }

  console.log('\n📋 [3/5] RECHAZO DE MUTACIÓN CRUZADA (CROSS-TENANT MUTATION BLOCK)');
  {
    let blocked = false;
    await runWithTenant('tenant_legitimate', async () => {
      try {
        await executeTenantIsolationGuard({
          model: 'Product',
          operation: 'create',
          args: { data: { title: 'Cross Attack', tenantId: 'tenant_victim' } },
          query: async () => ({})
        });
      } catch (err) {
        blocked = err instanceof TenantIsolationViolationError;
      }
    });

    assert(blocked, 'Intento de crear un registro con tenantId ajeno es bloqueado con TenantIsolationViolationError');
  }

  console.log('\n📋 [4/5] BYPASS AUTORIZADO DE SISTEMA / SUPER_ADMIN');
  {
    let executed = false;
    await runWithSystemContext(async () => {
      const res = await executeTenantIsolationGuard({
        model: 'Product',
        operation: 'findMany',
        args: { where: {} },
        query: async () => [{ id: 'global_p1' }]
      });
      executed = res.length === 1;
    });

    assert(executed, 'runWithSystemContext() permite bypass legítimo para procesos globales auditados');
  }

  console.log('\n📋 [5/5] MODELOS NO TENANT-SCOPED PERMITEN CONSULTAS GLOBALES');
  {
    let executedNonTenant = false;
    const res = await executeTenantIsolationGuard({
      model: 'User',
      operation: 'findUnique',
      args: { where: { email: 'admin@fenixcms.es' } },
      query: async () => ({ id: 'u1' })
    });
    executedNonTenant = res !== null;

    assert(executedNonTenant, 'Modelos no tenant-scoped (e.g. User global) no son bloqueados por el filtro de tenant');
  }

  console.log('\n================================================================================');
  console.log('🎉 TODOS LOS TESTS DE LA FASE 25 COMPLETADOS CON ÉXITO');
  console.log('================================================================================\n');
}

if (require.main === module) {
  runFase25Tests().catch(err => {
    console.error('Error en suite FASE 25:', err);
    process.exit(1);
  });
}
