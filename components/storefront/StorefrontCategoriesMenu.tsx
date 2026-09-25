'use client';

import React from 'react';
import { SupportedLocale } from '@/types';
import { getTranslation, getProductCategory } from '@/lib/i18n';
import { Menu, Zap, Truck } from 'lucide-react';

interface StorefrontCategoriesMenuProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  currentLocale: SupportedLocale;
  onOpenAdmin: () => void;
  tenantSlug: string;
}

export function StorefrontCategoriesMenu({
  categories,
  selectedCategory,
  onSelectCategory,
  currentLocale,
  onOpenAdmin,
  tenantSlug
}: StorefrontCategoriesMenuProps) {
  return (
    <div className="bg-[#232f3e] px-4 py-1.5 border-t border-slate-700/60 overflow-x-auto scrollbar-none">
      <div className="max-w-[1500px] mx-auto flex items-center justify-between text-xs min-w-max gap-4">
        <div className="flex items-center gap-4 text-slate-200 font-medium">
          <button 
            onClick={() => onSelectCategory('all')}
            className="flex items-center gap-1 font-bold text-white hover:text-amber-400 transition cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>{getTranslation(currentLocale, 'store.all_menu')}</span>
          </button>

          <button 
            onClick={() => onSelectCategory('all')}
            className="hover:text-amber-400 text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{getTranslation(currentLocale, 'store.flash_deals_nav')}</span>
          </button>

          {categories.filter(c => c !== 'all').map(cat => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`hover:text-white transition cursor-pointer ${
                selectedCategory === cat ? 'text-amber-400 font-bold' : 'text-slate-300'
              }`}
            >
              {getProductCategory(cat, currentLocale)}
            </button>
          ))}

          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>{getTranslation(currentLocale, 'store.correos_badge')}</span>
          </span>
        </div>

        {/* Direct jump to Merchant Backoffice */}
        <button
          onClick={onOpenAdmin}
          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shadow transition flex items-center gap-1 cursor-pointer"
        >
          <span>{getTranslation(currentLocale, 'store.manage_store_btn')} ({tenantSlug}.com/admin)</span>
        </button>
      </div>
    </div>
  );
}
