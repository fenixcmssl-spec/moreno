'use client';

import React from 'react';
import { StoreProvider } from '@/lib/storeContext';
import { DomainNavbar } from '@/components/DomainNavbar';
import { FenixStorefront } from './FenixStorefront';
import { StorefrontResolutionPayload } from '@/lib/services/storefront.service';

interface StorefrontServerViewProps {
  initialData: StorefrontResolutionPayload;
}

export function StorefrontServerView({ initialData }: StorefrontServerViewProps) {
  return (
    <StoreProvider
      initialRoute="store_front"
      initialTenant={initialData.tenant}
      initialProducts={initialData.products}
      initialBlogPosts={initialData.content.blogPosts}
      initialClassifiedAds={initialData.content.classifiedAds}
      initialLocale={initialData.language.defaultLocale}
      initialActiveThemeId={initialData.theme.id}
    >
      <div className="min-h-screen bg-[#eaeded] flex flex-col font-sans">
        <DomainNavbar />
        <main className="flex-1">
          <FenixStorefront />
        </main>
      </div>
    </StoreProvider>
  );
}
