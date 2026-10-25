import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionService } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export type PageAccessMode = 'saas' | 'superadmin';

const SAAS_MANAGEMENT_ROLES = new Set([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'EDITOR',
  'STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
]);

export async function requirePageSession(mode: PageAccessMode) {
  const loginPath = mode === 'superadmin'
    ? '/superadmin/login'
    : '/login';

  const requestHeaders = await headers();

  // Las páginas de la plataforma se sirven en el dominio SaaS,
  // no dentro del contexto de una tienda.
  if (requestHeaders.get('x-is-tenant-storefront') === 'true') {
    redirect(
      mode === 'superadmin'
        ? 'https://fenixcms.es/superadmin/login'
        : 'https://fenixcms.es/login'
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SessionService.getCookieName())?.value;

  if (!token) {
    redirect(loginPath);
  }

  const session = await SessionService.getSession(token).catch(() => null);

  if (!session) {
    redirect(loginPath);
  }

  const userDelegate = (prisma as any)?.user;

  if (typeof userDelegate?.findUnique !== 'function') {
    console.error('[PageAuth] Prisma User delegate no disponible.');
    redirect(loginPath);
  }

  let dbUser: any = null;
  let databaseLookupFailed = false;

  try {
    if (mode === 'superadmin') {
      dbUser = await userDelegate.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });
    } else {
      dbUser = await userDelegate.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          role: true,
          status: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: {
              tenantId: true,
              role: true,
              status: true,
              tenant: {
                select: {
                  id: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }
  } catch {
    databaseLookupFailed = true;
    console.error('[PageAuth] Falló la verificación de la cuenta.');
  }

  // Ante un error de PostgreSQL o un usuario inexistente, denegar acceso.
  if (
    databaseLookupFailed ||
    !dbUser ||
    dbUser.status !== 'ACTIVE'
  ) {
    redirect(loginPath);
  }

  if (mode === 'superadmin') {
    if (
      session.role !== 'SUPER_ADMIN' ||
      dbUser.role !== 'SUPER_ADMIN'
    ) {
      redirect('/superadmin/login?error=access_denied');
    }

    return session;
  }

  // El portal SaaS no concede acceso a clientes compradores ni al
  // superadministrador a través del formulario de clientes.
  if (!SAAS_MANAGEMENT_ROLES.has(String(session.role))) {
    redirect('/login?error=access_denied');
  }

  // Una cuenta de gestión debe tener una membresía activa que coincida
  // exactamente con el tenant y el rol de la sesión validada.
  if (!session.tenantId) {
    redirect('/login?error=membership_required');
  }

  const memberships = Array.isArray(dbUser.memberships)
    ? dbUser.memberships
    : [];

  const matchingMembership = memberships.find((membership: any) => {
    const tenantStatus = String(
      membership.tenant?.status ?? ''
    ).toLowerCase();

    return (
      membership.status === 'ACTIVE' &&
      membership.tenantId === session.tenantId &&
      membership.role === session.role &&
      membership.tenant?.id === session.tenantId &&
      ['active', 'trial'].includes(tenantStatus)
    );
  });

  if (!matchingMembership) {
    redirect('/login?error=membership_required');
  }

  return session;
}
