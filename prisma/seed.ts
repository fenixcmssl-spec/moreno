import { PrismaClient } from '@prisma/client';
import { seedMasterData } from './seeds/master-data';
import { bootstrapInitialAdmin } from './seeds/admin-bootstrap';
import { seedDemoData } from './seeds/demo-data';

const prisma = new PrismaClient({ log: [] });

export async function main() {
  console.log('🌱 ========================================================');
  console.log('🌱 INICIANDO SEED DE FENIXCMS SAAS EN POSTGRESQL');
  console.log(`🌱 ENTORNO: ${process.env.NODE_ENV || 'development'}`);
  console.log('🌱 ========================================================\n');

  try {
    // 1. Siempre sembrar datos maestros (Apps, Planes, Entitlements, Roles, Settings)
    await seedMasterData(prisma);

    // 2. Bootstrap idempotente de Super Administrador
    await bootstrapInitialAdmin(prisma);

    // 3. Control de datos de demostración
    const isProduction = process.env.NODE_ENV === 'production';
    const disableDemo = process.env.NO_DEMO === 'true' || process.env.DISABLE_DEMO_SEED === 'true';

    if (isProduction || disableDemo) {
      console.log('🛡️ [SEED INFO] Modo Producción o NO_DEMO activo. Saltando sembrado de tenants y productos demo.');
    } else {
      console.log('🧪 [SEED INFO] Modo Desarrollo/Test activo. Sembrando tenants y catálogo demo...');
      await seedDemoData(prisma);
    }

    console.log('\n========================================================');
    console.log('✨ SEED DE POSTGRESQL FINALIZADO CON ÉXITO');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Fatal seed execution error:', e);
      process.exit(1);
    });
}
