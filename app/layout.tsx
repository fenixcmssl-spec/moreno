import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'FenixCMS SaaS - Multi-tenant CMS & E-commerce Platform',
  description: 'Plataforma CMS SaaS Multi-tenant con venta de licencias, e-commerce avanzado Fenix Storefront, multidominio, multi-idioma (IT, ES, EN, FR, DE, PT), motor de plugins, temas y el importador masivo Fenix All Import Pro.',
  openGraph: {
    title: 'FenixCMS SaaS - Multi-tenant CMS & E-commerce Platform',
    description: 'CMS SaaS Multi-tenant con venta de licencias, e-commerce avanzado Fenix Storefront, multidominio, multi-idioma, motor de plugins y temas.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FenixCMS SaaS - Multi-tenant CMS & E-commerce Platform',
    description: 'CMS SaaS Multi-tenant con venta de licencias, e-commerce avanzado Fenix Storefront, multidominio, multi-idioma, motor de plugins y temas.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
