import { prisma, isPostgresConfigured } from '../lib/prisma';
import { PasswordService } from '../lib/auth/password';

/**
 * Bootstrap script to initialize the first Super Admin safely via environment variables
 * Usage: FENIXCMS_BOOTSTRAP_ADMIN_EMAIL=... FENIXCMS_BOOTSTRAP_ADMIN_PASSWORD=... npx tsx scripts/bootstrap-super-admin.ts
 */
async function bootstrapSuperAdmin() {
  const email = process.env.FENIXCMS_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FENIXCMS_BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('ℹ️ Variables FENIXCMS_BOOTSTRAP_ADMIN_EMAIL y FENIXCMS_BOOTSTRAP_ADMIN_PASSWORD no configuradas. Saltando bootstrap.');
    return;
  }

  if (!isPostgresConfigured()) {
    console.error('❌ DATABASE_URL no configurada.');
    return;
  }

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'SUPER_ADMIN' },
          { email }
        ]
      }
    });

    if (existingAdmin) {
      console.log(`ℹ️ El Super Admin (${existingAdmin.email}) ya existe en la base de datos.`);
      return;
    }

    const passwordHash = PasswordService.hashPassword(password);
    const adminUser = await prisma.user.create({
      data: {
        email,
        name: 'Super Admin FenixCMS',
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });

    console.log(`✅ Super Admin (${adminUser.email}) aprovisionado correctamente con hash seguro.`);
  } catch (err: any) {
    console.error('❌ Error en bootstrap del Super Admin:', err?.message);
  }
}

if (require.main === module) {
  bootstrapSuperAdmin().then(() => process.exit(0));
}

export { bootstrapSuperAdmin };
