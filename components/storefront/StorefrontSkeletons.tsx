import React from 'react';

/**
 * High-performance, zero-layout-shift UI Skeletons for React Suspense Streaming
 */

export function HeroBannerSkeleton() {
  return (
    <div className="relative bg-gradient-to-r from-slate-900 via-[#232f3e] to-slate-900 text-white py-8 px-4 border-b border-slate-300 animate-pulse">
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-6 w-32 bg-slate-700/80 rounded-full" />
          <div className="h-9 w-3/4 bg-slate-700/80 rounded-lg" />
          <div className="h-4 w-1/2 bg-slate-700/60 rounded" />
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center space-y-3">
          <div className="h-4 w-28 bg-slate-700/80 rounded mx-auto" />
          <div className="h-8 w-44 bg-slate-700/80 rounded mx-auto" />
          <div className="h-3 w-36 bg-slate-700/60 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}

export function CategoriesMenuSkeleton() {
  return (
    <div className="bg-[#232f3e] px-4 py-2 border-t border-slate-700/60 animate-pulse">
      <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-slate-700/80 rounded" />
          <div className="h-4 w-24 bg-slate-700/80 rounded" />
          <div className="h-4 w-28 bg-slate-700/80 rounded" />
          <div className="h-4 w-24 bg-slate-700/80 rounded" />
        </div>
        <div className="h-6 w-32 bg-slate-700/80 rounded" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            {/* Image Placeholder */}
            <div className="w-full aspect-square mb-3 bg-slate-200 rounded-md" />

            {/* Title Placeholder */}
            <div className="h-3.5 bg-slate-200 rounded w-5/6 mb-1.5" />
            <div className="h-3.5 bg-slate-200 rounded w-2/3 mb-2" />

            {/* Rating */}
            <div className="flex items-center gap-1 mb-2">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-6 bg-slate-200 rounded" />
            </div>

            {/* Price */}
            <div className="mb-2">
              <div className="h-5 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-2.5 w-28 bg-slate-200 rounded" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-2">
            <div className="h-7 w-full bg-slate-200 rounded-full" />
            <div className="h-7 w-full bg-slate-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlogFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="aspect-video w-full bg-slate-200 rounded-lg" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-5 w-4/5 bg-slate-200 rounded" />
          <div className="h-3.5 w-full bg-slate-200 rounded" />
          <div className="h-3.5 w-2/3 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function StorefrontFullSkeleton() {
  return (
    <div className="min-h-screen bg-[#eaeded]">
      {/* Header Bar */}
      <div className="h-14 bg-[#131921] w-full animate-pulse" />
      <CategoriesMenuSkeleton />
      <HeroBannerSkeleton />
      <div className="max-w-[1500px] mx-auto px-4 py-8 space-y-6">
        <div className="h-6 w-48 bg-slate-300 rounded animate-pulse" />
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
