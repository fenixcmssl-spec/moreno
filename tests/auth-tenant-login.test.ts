import { randomUUID } from 'node:crypto';
import prisma, { isPostgresConfigured } from '../lib/prisma';
import { runWithSystemContext } from '../lib/auth/tenantContext';
import { PasswordService } from '../lib/auth/password';
import { AuthService } from '../lib/services/auth.service';

function assertTest(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`  ✅ [PASS] ${message}`);
}

export async function runAuthTenantLoginTests(): Promise<void> {
  console.log('\n==================================================');
  console.log(' FENIXCMS — PRUEBAS DE LOGIN MULTI-TENANT');
  console.log('==================================================');

  const databaseName = (() => {
    try {
      return new URL(process.env.DATABASE_URL || '')
        .pathname.split('/').filter(Boolean).pop() || '';
    } catch {
      return '';
    }
  })();

  if (databaseName !== 'fenixcms_ci' || !isPostgresConfigured()) {
    throw new Error(
      'Las pruebas de login requieren PostgreSQL y la base fenixcms_ci.'
    );
  }

  const tenant = await runWithSystemContext(() =>
    prisma.tenant.findUnique({
      where: { id: 'tenant_demo' },
      select: { id: true, slug: true, status: true },
    })
  );

  if (
    !tenant ||
    !['active', 'trial'].includes(String(tenant.status).toLowerCase())
  ) {
    throw new Error(
      'No existe un tenant_demo activo para ejecutar las pruebas de login.'
    );
  }

  const suffix = randomUUID();
  const ownerEmail = `u8-owner-${suffix}@example.invalid`;
  const adminEmail = `u8-superadmin-${suffix}@example.invalid`;
  const ownerPassword = `Test-Owner-${randomUUID()}-Aa9!`;
  const adminPassword = `Test-Admin-${randomUUID()}-Bb8!`;

  const createdUserIds: string[] = [];
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnv.NODE_ENV;

  try {
    const owner = await runWithSystemContext(() =>
      prisma.user.create({
        data: {
          email: ownerEmail,
          name: 'FenixCMS U8 Tenant Test',
          passwordHash: PasswordService.hashPassword(ownerPassword),
          role: 'OWNER',
          status: 'ACTIVE',
          memberships: {
            create: {
              tenantId: tenant.id,
              role: 'OWNER',
              status: 'ACTIVE',
            },
          },
        },
        select: { id: true },
      })
    );
    createdUserIds.push(owner.id);

    const superAdmin = await runWithSystemContext(() =>
      prisma.user.create({
        data: {
          email: adminEmail,
          name: 'FenixCMS U8 Superadmin Test',
          passwordHash: PasswordService.hashPassword(adminPassword),
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
        select: { id: true },
      })
    );
    createdUserIds.push(superAdmin.id);

    async function productionLogin(params: {
      email: string;
      password: string;
      tenantSlug: string;
    }) {
      try {
        mutableEnv.NODE_ENV = 'production';
        return await runWithSystemContext(() => AuthService.login(params));
      } finally {
        if (previousNodeEnv === undefined) {
          delete mutableEnv.NODE_ENV;
        } else {
          mutableEnv.NODE_ENV = previousNodeEnv;
        }
      }
    }

    const validLogin = await productionLogin({
      email: ownerEmail,
      password: ownerPassword,
      tenantSlug: tenant.slug,
    });

    assertTest(
      validLogin.success === true &&
        validLogin.session?.tenantId === tenant.id &&
        validLogin.session?.role === 'OWNER',
      'Una membresía ACTIVE permite entrar únicamente a su tienda'
    );

    const wrongTenantLogin = await productionLogin({
      email: ownerEmail,
      password: ownerPassword,
      tenantSlug: 'milanostyle',
    });

    assertTest(
      wrongTenantLogin.success === false && !wrongTenantLogin.token,
      'Rechaza el login cuando el usuario no pertenece al tenant solicitado'
    );

    await runWithSystemContext(async () => {
      await prisma.tenantMembership.update({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: owner.id,
          },
        },
        data: { status: 'INACTIVE' },
      });
    });

    const inactiveLogin = await productionLogin({
      email: ownerEmail,
      password: ownerPassword,
      tenantSlug: tenant.slug,
    });

    assertTest(
      inactiveLogin.success === false && !inactiveLogin.token,
      'Rechaza una membresía INACTIVE'
    );

    const superAdminLogin = await productionLogin({
      email: adminEmail,
      password: adminPassword,
      tenantSlug: tenant.slug,
    });

    assertTest(
      superAdminLogin.success === false && !superAdminLogin.token,
      'Rechaza el uso del login de tienda por una cuenta SUPER_ADMIN'
    );

    // Verificar la alternativa de desarrollo en memoria sin tocar PostgreSQL:
    // una cuenta sin membresía persistente no debe recibir un tenant arbitrario.
    const previousDatabaseUrl = process.env.DATABASE_URL;

    try {
      mutableEnv.NODE_ENV = 'test';
      process.env.DATABASE_URL = '';

      const fallbackEmail = `u8-memory-${randomUUID()}@example.invalid`;
      const fallbackPassword = `Test-Memory-${randomUUID()}-Cc7!`;

      const registered = await AuthService.register({
        name: 'FenixCMS U8 Memory Test',
        email: fallbackEmail,
        password: fallbackPassword,
        role: 'OWNER',
      });

      assertTest(
        registered.success === true,
        'Precondición: se crea una cuenta de prueba solo en memoria'
      );

      const fallbackLogin = await AuthService.login({
        email: fallbackEmail,
        password: fallbackPassword,
        tenantSlug: tenant.slug,
      });

      assertTest(
        fallbackLogin.success === false && !fallbackLogin.token,
        'La alternativa en memoria no puede autorizar un tenant no verificado'
      );
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }

      if (previousNodeEnv === undefined) {
        delete mutableEnv.NODE_ENV;
      } else {
        mutableEnv.NODE_ENV = previousNodeEnv;
      }
    }
  } finally {
    if (previousNodeEnv === undefined) {
      delete mutableEnv.NODE_ENV;
    } else {
      mutableEnv.NODE_ENV = previousNodeEnv;
    }

    if (createdUserIds.length > 0) {
      await runWithSystemContext(async () => {
        const ids = createdUserIds;

        // Retirar primero registros relacionados con los usuarios temporales.
        await (prisma as any).auditLog.deleteMany({
          where: { userId: { in: ids } },
        }).catch(() => undefined);

        await prisma.session.deleteMany({
          where: { userId: { in: ids } },
        });

        await prisma.tenantMembership.deleteMany({
          where: { userId: { in: ids } },
        });

        await prisma.user.deleteMany({
          where: { id: { in: ids } },
        });
      });
    }
  }

  console.log(' RESULTADO: pruebas específicas de login completadas.');
}

if (require.main === module) {
  runAuthTenantLoginTests().catch((error) => {
    console.error('Error en pruebas de login multi-tenant:', error);
    process.exitCode = 1;
  });
}
