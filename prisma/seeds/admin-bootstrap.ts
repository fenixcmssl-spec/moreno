import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import { PasswordService } from '../../lib/auth/password';

export async function bootstrapInitialAdmin(prisma: PrismaClient) {
  console.log('👑 [ADMIN BOOTSTRAP] Verificando Super Admin inicial...');

  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || (isProduction ? undefined : 'admin@fenixcms.com');
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? undefined : 'FenixAdmin2026!Secure');
  const adminName = process.env.INITIAL_ADMIN_NAME || 'Fenix Super Admin';

  if (!adminEmail || !adminPassword) {
    if (isProduction) {
      console.warn('⚠️ [ADMIN BOOTSTRAP] INITIAL_ADMIN_EMAIL o INITIAL_ADMIN_PASSWORD no configuradas en entorno de producción. Saltando creación de Super Admin.');
      return;
    }
  }

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { role: 'SUPER_ADMIN' }
      ]
    }
  });

  if (existingAdmin) {
    console.log(`ℹ️ [ADMIN BOOTSTRAP] Super Admin existente detectado (${existingAdmin.email}). Asegurando rol SUPER_ADMIN y estado ACTIVE...`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'SUPER_ADMIN' as UserRole,
        status: 'ACTIVE' as AccountStatus
      }
    });
    console.log('✅ [ADMIN BOOTSTRAP] Super Admin verificado e idempotente.');
    return;
  }

  console.log(`🚀 [ADMIN BOOTSTRAP] Creando Super Admin inicial (${adminEmail})...`);
  const passwordHash = PasswordService.hashPassword(adminPassword!);

  const newAdmin = await prisma.user.create({
    data: {
      email: adminEmail!,
      name: adminName,
      passwordHash,
      role: 'SUPER_ADMIN' as UserRole,
      status: 'ACTIVE' as AccountStatus
    }
  });

  console.log(`✅ [ADMIN BOOTSTRAP] Super Admin inicial creado exitosamente (ID: ${newAdmin.id}, Email: ${newAdmin.email}).`);
}
