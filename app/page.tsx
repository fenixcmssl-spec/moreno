'use client';

import React, { Suspense } from 'react';
import { StoreProvider, useStore } from '@/lib/storeContext';
import { DomainNavbar } from '@/components/DomainNavbar';
import { SaasLanding } from '@/components/saas/SaasLanding';
import { SuperAdminPortal } from '@/components/saas/SuperAdminPortal';
import { MerchantLoginPortal } from '@/components/saas/MerchantLoginPortal';
import { FenixStorefront } from '@/components/storefront/FenixStorefront';
import { MerchantAdmin } from '@/components/admin/MerchantAdmin';
import { ShopperLoginPortal } from '@/components/storefront/ShopperLoginPortal';
import { StorefrontFullSkeleton } from '@/components/storefront/StorefrontSkeletons';

function AppContent() {
  const { currentRoute } = useStore();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <DomainNavbar />
      
      <main className="flex-1">
        {currentRoute === 'saas_landing' && <SaasLanding />}
        {currentRoute === 'saas_admin' && <SuperAdminPortal />}
        {currentRoute === 'saas_login' && <MerchantLoginPortal />}
        {currentRoute === 'store_front' && (
          <Suspense fallback={<StorefrontFullSkeleton />}>
            <FenixStorefront />
          </Suspense>
        )}
        {currentRoute === 'store_admin' && <MerchantAdmin />}
        {currentRoute === 'store_login' && <ShopperLoginPortal />}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
