import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { StoreProvider } from '@/lib/storeContext';
import { MerchantAdmin } from '@/components/admin/MerchantAdmin';
import { SessionService } from '@/lib/auth/session';
import { runWithSystemContext } from '@/lib/auth/tenantContext';
import { TenantService } from '@/lib/services/tenant.service';
import { StorefrontService } from '@/lib/services/storefront.service';

export const dynamic = 'force-dynamic';

const TENANT_MANAGEMENT_ROLES = new Set([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'EDITOR',
  'STAFF',
  'TENANT_OWNER',
  'TENANT_ADMIN',
]);

export default async function TenantAdminPage() {
  const requestHeaders = await headers();

  if (requestHeaders.get('x-is-tenant-storefront') !== 'true') {
    notFound();
  }

  const hostname = StorefrontService.sanitizeHostname(
    requestHeaders.get('x-resolved-hostname') ||
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host')
  );

  const resolved = await StorefrontService.resolveStorefront(hostname, {
    forceFresh: true,
  });

  if (
    !resolved ||
    !['active', 'trial'].includes(String(resolved.tenant.status).toLowerCase())
  ) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SessionService.getCookieName())?.value;

  if (!token) {
    redirect('/login');
  }

  const session = await SessionService.getSession(token).catch(() => null);

  if (!session) {
    redirect('/login?error=session_invalid');
  }

  if (!TENANT_MANAGEMENT_ROLES.has(String(session.role))) {
    redirect('/login?error=tenant_role_required');
  }

  // No se permite reutilizar una sesión perteneciente a otra tienda.
  if (session.tenantId !== resolved.tenant.id) {
    redirect('/login?error=tenant_mismatch');
  }

  let membershipResult = null;

  try {
    membershipResult = await runWithSystemContext(() =>
      TenantService.validateUserMembership(session.userId, resolved.tenant.id)
    );
  } catch {
    redirect('/login?error=membership_check_failed');
  }

  if (
    !membershipResult?.valid ||
    !membershipResult.membership ||
    membershipResult.membership.status !== 'ACTIVE' ||
    membershipResult.membership.tenantId !== resolved.tenant.id ||
    membershipResult.membership.role !== session.role
  ) {
    redirect('/login?error=membership_required');
  }

  // El dominio usado en esta página es el host comprobado de la petición.
  // Esta copia solo inicializa la interfaz; no modifica PostgreSQL.
  const tenantForView = {
    ...resolved.tenant,
    domain: hostname,
  };

  return (
    <StoreProvider
      initialRoute="store_admin"
      initialTenant={tenantForView}
      initialProducts={resolved.products}
    >
      <MerchantAdmin />
    </StoreProvider>
  );
}
