import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StorefrontService } from '@/lib/services/storefront.service';
import { INITIAL_TENANTS } from '@/lib/initialData';
import { StorefrontFullSkeleton } from '@/components/storefront/StorefrontSkeletons';
import { StorefrontServerView } from '@/components/storefront/StorefrontServerView';
import prisma, { isPostgresConfigured } from '@/lib/prisma';

// 1. Incremental Static Regeneration (ISR) configuration
export const revalidate = 60; // Revalidate static cache every 60 seconds
export const dynamicParams = true; // Support on-demand ISR for new merchants

/**
 * Pre-renders the most active merchant storefronts at build time for sub-second TTFB
 */
export async function generateStaticParams() {
  try {
    if (isPostgresConfigured() && prisma) {
      const activeTenants = await (prisma as any).tenant.findMany({
        where: { status: 'active' },
        select: { slug: true },
        take: 20,
      });

      if (activeTenants && activeTenants.length > 0) {
        return activeTenants.map((t: { slug: string }) => ({
          slug: t.slug,
        }));
      }
    }
  } catch (err) {
    console.warn('generateStaticParams PostgreSQL query fallback:', err);
  }

  // Fallback to active demo tenant slugs
  return INITIAL_TENANTS.map((t) => ({
    slug: t.slug,
  }));
}

/**
 * Dynamic SEO & OpenGraph Metadata for ISR Storefronts
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const storefrontData = await StorefrontService.resolveStorefront('', {
    fallbackSlug: slug,
  });

  if (!storefrontData) {
    return {
      title: 'Tienda no encontrada | FenixCMS',
    };
  }

  const { tenant } = storefrontData;
  return {
    title: `${tenant.name} | Tienda Online Oficial`,
    description: tenant.settings?.tagline || `Compra en línea en ${tenant.name}. Envíos rápidos y pagos seguros.`,
    openGraph: {
      title: `${tenant.name} | Tienda Online`,
      description: tenant.settings?.tagline || `Catálogo oficial de ${tenant.name}`,
      images: [
        {
          url: tenant.branding?.logoUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80',
          width: 1200,
          height: 630,
          alt: tenant.name,
        },
      ],
    },
  };
}

/**
 * Server-rendered Storefront Page with ISR & React Suspense Streaming
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const storefrontData = await StorefrontService.resolveStorefront('', {
    fallbackSlug: slug,
  });

  if (!storefrontData) {
    notFound();
  }

  return (
    <Suspense fallback={<StorefrontFullSkeleton />}>
      <StorefrontServerView initialData={storefrontData} />
    </Suspense>
  );
}
