import type { Metadata } from 'next';
import { StoreProvider } from '@/lib/storeContext';
import { SuperAdminPortal } from '@/components/saas/SuperAdminPortal';
import { requirePageSession } from '@/lib/auth/require-page-session';

export const metadata: Metadata = {
  title: 'Superadministración | FenixCMS',
  description: 'Consola privada de superadministración de FenixCMS.',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  await requirePageSession('superadmin');

  return (
    <StoreProvider>
      <SuperAdminPortal />
    </StoreProvider>
  );
}
