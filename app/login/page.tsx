import type { Metadata } from 'next';
import { AuthLoginForm } from '@/components/auth/AuthLoginForm';

export const metadata: Metadata = {
  title: 'Acceso de clientes | FenixCMS',
  description: 'Acceso seguro al portal SaaS de clientes de FenixCMS.',
};

export default function LoginPage() {
  return <AuthLoginForm mode="saas" />;
}
