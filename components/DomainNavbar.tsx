'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { DomainRoute, SupportedLocale } from '@/types';
import { LANGUAGES, getTranslation } from '@/lib/i18n';
import { 
  Globe, 
  Shield, 
  ShoppingBag, 
  Settings, 
  LogIn, 
  User, 
  Lock, 
  Database, 
  RotateCcw, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

export function DomainNavbar() {
  const { 
    currentRoute, 
    setCurrentRoute, 
    currentLocale, 
    setCurrentLocale, 
    tenant,
    resetToDemoData,
    isAuthenticated,
    currentUser,
    logoutBackend
  } = useStore();

  const getUrlForRoute = (route: DomainRoute): string => {
    switch (route) {
      case 'saas_landing': return 'https://fenixcms.es';
      case 'saas_admin': return 'https://fenixcms.es/admin';
      case 'saas_login': return 'https://fenixcms.es/login';
      case 'store_front': return `https://${tenant.customDomain || 'tutienda.com'}`;
      case 'store_admin': return `https://${tenant.customDomain || 'tutienda.com'}/admin`;
      case 'store_login': return `https://${tenant.customDomain || 'tutienda.com'}/login`;
      default: return 'https://fenixcms.es';
    }
  };

  const navItems: { route: DomainRoute; label: string; icon: React.ReactNode; badgeKey: string }[] = [
    { route: 'saas_landing', label: 'fenixcms.es', icon: <Globe className="w-3.5 h-3.5" />, badgeKey: 'nav.badge_saas_home' },
    { route: 'saas_admin', label: 'fenixcms.es/admin', icon: <Shield className="w-3.5 h-3.5" />, badgeKey: 'nav.badge_super_admin' },
    { route: 'saas_login', label: 'fenixcms.es/login', icon: <LogIn className="w-3.5 h-3.5" />, badgeKey: 'nav.badge_merchant_login' },
    { route: 'store_front', label: `${tenant.customDomain || 'tutienda.com'}`, icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, badgeKey: 'nav.badge_fenix_store' },
    { route: 'store_admin', label: `${tenant.customDomain || 'tutienda.com'}/admin`, icon: <Settings className="w-3.5 h-3.5 text-blue-400" />, badgeKey: 'nav.badge_backoffice' },
    { route: 'store_login', label: `${tenant.customDomain || 'tutienda.com'}/login`, icon: <User className="w-3.5 h-3.5" />, badgeKey: 'nav.badge_shopper_account' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-slate-100 border-b border-slate-800 shadow-xl font-sans text-xs">
      {/* Top simulation control bar */}
      <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* URL Bar Simulator */}
        <div className="flex items-center gap-2 flex-1 min-w-[300px] max-w-xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 text-slate-300 w-full shadow-inner">
            <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono font-medium tracking-tight text-emerald-400 select-none">https://</span>
            <span className="text-[11px] font-mono font-semibold text-white truncate flex-1">
              {getUrlForRoute(currentRoute).replace('https://', '')}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-800 text-slate-400 rounded border border-slate-700 uppercase">
              {currentRoute.includes('saas') ? getTranslation(currentLocale, 'nav.saas_core') : getTranslation(currentLocale, 'nav.tenant_store')}
            </span>
          </div>
        </div>

        {/* Right Tools: Language Picker, DB status & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-language Selector */}
          <div className="relative group">
            <select
              value={currentLocale}
              onChange={(e) => setCurrentLocale(e.target.value as SupportedLocale)}
              className="appearance-none bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 rounded px-2.5 py-1 pr-6 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
              aria-label="Seleccionar idioma"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Firestore Status Pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-[10px] font-medium" title="Firestore Live Connection">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3 h-3" />
            <span className="hidden sm:inline">{getTranslation(currentLocale, 'nav.firestore_live')}</span>
          </div>

          {/* Admin Session Badge */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-amber-500/40 text-[10px] text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-mono font-bold hidden sm:inline">{currentUser?.email || 'info@fenixcms.es'}</span>
              <button
                onClick={logoutBackend}
                className="text-rose-400 hover:text-rose-300 ml-1 text-[9px] font-bold uppercase underline"
                title="Cerrar sesión"
              >
                {getTranslation(currentLocale, 'nav.logout')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentRoute('saas_login')}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition"
              title="Iniciar sesión en el backend"
            >
              <LogIn className="w-3 h-3" />
              <span className="hidden sm:inline">{getTranslation(currentLocale, 'nav.login_backend')}</span>
            </button>
          )}

          {/* Reset Demo Button */}
          <button
            onClick={() => {
              if (confirm('¿Restaurar los datos de ejemplo iniciales? / Reset demo data?')) {
                resetToDemoData();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Restaurar datos predeterminados"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span className="hidden md:inline text-[10px]">{getTranslation(currentLocale, 'nav.reset')}</span>
          </button>
        </div>
      </div>

      {/* Environment fast switch buttons */}
      <div className="bg-slate-900 border-t border-slate-800/80 px-3 py-1.5 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> {getTranslation(currentLocale, 'nav.environments')}
          </span>

          {navItems.map((item) => {
            const isActive = currentRoute === item.route;
            const badgeLabel = getTranslation(currentLocale, item.badgeKey);
            return (
              <button
                key={item.route}
                onClick={() => setCurrentRoute(item.route)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {badgeLabel && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${
                    isActive ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {badgeLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
