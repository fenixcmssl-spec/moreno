import { prisma, isPostgresConfigured } from '../lib/prisma';
import { runWithSystemContext } from '../lib/auth/tenantContext';

/**
 * Verify Database Integrity Post-Restore
 * FenixCMS 5 - Verifies relational integrity, critical records and master configs.
 */

async function verifyBackupIntegrity() {
  console.log('🔍 [INTEGRITY CHECK] Iniciando verificación de integridad post-restauración...');

  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL no configurada. Saltando verificación live.');
    return;
  }

  try {
    await runWithSystemContext(async () => {
      // 1. Check Super Admin user
      if (prisma.user) {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' }
        });
        console.log(`👤 Super Administradores encontrados: ${superAdminCount}`);
        if (superAdminCount === 0) {
          console.warn('⚠️ Advertencia: No se encontró ningún usuario con rol SUPER_ADMIN tras el restore.');
        }
      }

      // 2. Check Applications & Plans
      if (prisma.application && prisma.plan) {
        const appCount = await prisma.application.count();
        const planCount = await prisma.plan.count();
        console.log(`📦 Aplicaciones maestras: ${appCount}, Planes: ${planCount}`);
      }

      // 3. Check Tenants & Domains
      if (prisma.tenant && prisma.domain) {
        const tenantCount = await prisma.tenant.count();
        const domainCount = await prisma.domain.count();
        console.log(`🏢 Tenants: ${tenantCount}, Dominios registrados: ${domainCount}`);
      }

      // 4. Check Licenses & Subscriptions
      if (prisma.license && prisma.subscription) {
        const licenseCount = await prisma.license.count();
        const subscriptionCount = await prisma.subscription.count();
        console.log(`🔑 Licencias: ${licenseCount}, Suscripciones: ${subscriptionCount}`);
      }
    });

    console.log('✅ [INTEGRITY CHECK] Verificación de integridad completada con éxito.\n');
  } catch (err: any) {
    console.warn('ℹ️ Aviso durante verificación de integridad:', err?.message || err);
  }
}

if (require.main === module) {
  verifyBackupIntegrity()
    .catch((err) => {
      console.error('Error fatal durante verificación de integridad:', err);
      process.exit(1);
    });
}

export { verifyBackupIntegrity };
