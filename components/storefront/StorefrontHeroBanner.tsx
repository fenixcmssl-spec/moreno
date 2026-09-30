'use client';

import React from 'react';
import { SupportedLocale } from '@/types';
import { getTranslation } from '@/lib/i18n';
import { Zap, Clock } from 'lucide-react';

interface StorefrontHeroBannerProps {
  currentLocale: SupportedLocale;
  freeShippingThreshold: number;
}

export function StorefrontHeroBanner({ currentLocale, freeShippingThreshold }: StorefrontHeroBannerProps) {
  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-[#232f3e] to-slate-900 text-white py-8 px-4 border-b border-slate-300">
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        
        <div className="lg:col-span-2 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow">
            <Zap className="w-3.5 h-3.5" />
            <span>{getTranslation(currentLocale, 'store.hero_badge')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {getTranslation(currentLocale, 'store.hero_title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {getTranslation(currentLocale, 'store.hero_desc')}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-center space-y-2">
          <div className="text-xs text-amber-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" /> {getTranslation(currentLocale, 'store.countdown_label')}
          </div>
          <div className="flex justify-center gap-2 font-mono text-xl font-black text-white">
            <span className="bg-black/50 px-2 py-1 rounded">08h</span>
            <span>:</span>
            <span className="bg-black/50 px-2 py-1 rounded">42m</span>
            <span>:</span>
            <span className="bg-black/50 px-2 py-1 rounded">19s</span>
          </div>
          <div className="text-[11px] text-slate-300">
            {getTranslation(currentLocale, 'store.free_shipping_notice')} {freeShippingThreshold}€
          </div>
        </div>

      </div>
    </section>
  );
}
