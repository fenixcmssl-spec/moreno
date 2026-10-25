import type { Metadata } from 'next';
import { AuthLoginForm } from '@/components/auth/AuthLoginForm';

export const metadata: Metadata = {
  title: 'Acceso Superadministrador | FenixCMS',
  description: 'Acceso restringido a la superadministración de FenixCMS.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperAdminLoginPage() {
  return <AuthLoginForm mode="superadmin" />;
}
