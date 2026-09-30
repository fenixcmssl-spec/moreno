'use client';

import React from 'react';
import Image from 'next/image';
import { ProductItem, SupportedLocale } from '@/types';
import { getTranslation, getProductTitle, getProductDescription } from '@/lib/i18n';
import { Star, Truck } from 'lucide-react';

interface StorefrontProductGridProps {
  products: ProductItem[];
  currentLocale: SupportedLocale;
  onSelectProduct: (product: ProductItem) => void;
  onAddToCart: (product: ProductItem, quantity?: number) => void;
  onBuyNow: (product: ProductItem) => void;
}

export function StorefrontProductGrid({
  products,
  currentLocale,
  onSelectProduct,
  onAddToCart,
  onBuyNow
}: StorefrontProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm my-6">
        <div className="text-slate-400 text-sm font-medium">
          {getTranslation(currentLocale, 'store.empty_search_results', 'No se encontraron productos disponibles en esta categoría.')}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {products.map((prod, index) => {
        const locTitle = getProductTitle(prod, currentLocale);
        const imageUrl = prod.images && prod.images.length > 0
          ? prod.images[0]
          : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';

        // LCP optimization: prioritize the first 2 images
        const isPriority = index < 2;

        return (
          <div
            key={prod.id}
            className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Optimized Next.js Image Container */}
              <div 
                onClick={() => onSelectProduct(prod)}
                className="relative w-full aspect-square mb-3 bg-slate-50 rounded overflow-hidden cursor-pointer flex items-center justify-center group-hover:opacity-95"
              >
                <Image
                  src={imageUrl}
                  alt={locTitle}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16.6vw"
                  priority={isPriority}
                  loading={isPriority ? 'eager' : 'lazy'}
                  referrerPolicy="no-referrer"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {prod.isDeal && prod.dealDiscountPercent && (
                  <span className="absolute top-2 left-2 bg-[#cc0c39] text-white text-[10px] font-black px-2 py-0.5 rounded shadow z-10">
                    -{prod.dealDiscountPercent}%
                  </span>
                )}
                {prod.isBestSeller && (
                  <span className="absolute bottom-2 left-2 bg-[#e67a00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                    {getTranslation(currentLocale, 'store.bestseller_badge')}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 
                onClick={() => onSelectProduct(prod)}
                className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-[#c45500] cursor-pointer mb-1 leading-snug"
                title={locTitle}
              >
                {locTitle}
              </h3>

              {/* Rating & Reviews */}
              <div className="flex items-center gap-1 mb-2">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < Math.floor(prod.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-blue-700 hover:underline cursor-pointer">
                  {prod.reviewsCount}
                </span>
              </div>

              {/* Price */}
              <div className="mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-slate-900">{prod.price.toFixed(2)}€</span>
                  {prod.compareAtPrice && (
                    <span className="text-xs text-slate-500 line-through">
                      {prod.compareAtPrice.toFixed(2)}€
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>{getTranslation(currentLocale, 'store.correos_shipping')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={() => onAddToCart(prod, 1)}
                className="w-full py-1.5 rounded-full bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
              >
                {getTranslation(currentLocale, 'store.add_to_cart')}
              </button>
              <button
                onClick={() => onBuyNow(prod)}
                className="w-full py-1.5 rounded-full bg-[#ffa41c] hover:bg-[#fa8900] text-slate-950 font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
              >
                {getTranslation(currentLocale, 'store.buy_now')}
              </button>
            </div>

          </div>
        );
      })}
    </div>
  );
}
