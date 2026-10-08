import { PrismaClient } from '@prisma/client';
import { seedMasterData } from './seeds/master-data';
import { bootstrapInitialAdmin } from './seeds/admin-bootstrap';

const prisma = new PrismaClient({ log: [] });

export async function bootstrapProduction() {
  console.log('🛡️ ========================================================');
  console.log('🛡️ INICIANDO BOOTSTRAP DE PRODUCCIÓN DE FENIXCMS (POSTGRESQL)');
  console.log('🛡️ (Solo datos maestros, roles, plataformas y super admin)');
  console.log('🛡️ ========================================================\n');

  try {
    await seedMasterData(prisma);
    await bootstrapInitialAdmin(prisma);

    console.log('\n========================================================');
    console.log('🎉 BOOTSTRAP DE PRODUCCIÓN COMPLETADO CON ÉXITO');
    console.log('🎉 Sistema listo para operar sin datos sintéticos ni demo tenants');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error durante el bootstrap de producción:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  bootstrapProduction()
    .catch((e) => {
      console.error('Fatal bootstrap error:', e);
      process.exit(1);
    });
}
