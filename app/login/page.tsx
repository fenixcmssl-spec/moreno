import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AuthLoginForm } from '@/components/auth/AuthLoginForm';
import { StorefrontService } from '@/lib/services/storefront.service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Acceso de clientes | FenixCMS',
  description: 'Acceso seguro al portal SaaS de clientes de FenixCMS.',
};

export default async function LoginPage() {
  const requestHeaders = await headers();
  const isTenantStorefront =
    requestHeaders.get('x-is-tenant-storefront') === 'true';

  if (!isTenantStorefront) {
    return <AuthLoginForm mode="saas" />;
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

  return (
    <AuthLoginForm
      mode="tenant"
      tenantSlug={resolved.tenant.slug}
      tenantName={resolved.tenant.name}
    />
  );
}
