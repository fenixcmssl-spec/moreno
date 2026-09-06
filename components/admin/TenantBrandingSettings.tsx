'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { MediaLibraryModal } from './MediaLibraryModal';
import { 
  Building2, 
  Palette, 
  Image as ImageIcon, 
  Globe, 
  Sparkles, 
  Save, 
  CheckCircle, 
  Upload, 
  ShieldCheck,
  Languages
} from 'lucide-react';
import { SupportedLocale } from '@/types';
import { LANGUAGES } from '@/lib/i18n';

export function TenantBrandingSettings() {
  const { tenant, updateTenantBranding, updateTenant } = useStore();

  const [name, setName] = useState(tenant.name || 'Corporación Fénix');
  const [logoUrl, setLogoUrl] = useState(tenant.branding?.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80');
  const [faviconUrl, setFaviconUrl] = useState(tenant.branding?.faviconUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80');
  const [primaryColor, setPrimaryColor] = useState(tenant.branding?.primaryColor || '#3b82f6');
  const [accentColor, setAccentColor] = useState(tenant.branding?.accentColor || '#f59e0b');
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || 'mitienda.fenixcms.com');
  const [seoTitle, setSeoTitle] = useState(tenant.branding?.seoTitle || 'Fénix Store | Soluciones de Comercio Electrónico');
  const [seoDescription, setSeoDescription] = useState(tenant.branding?.seoDescription || 'Plataforma líder en venta multicanal y comercio online.');
  const [activeLocales, setActiveLocales] = useState<SupportedLocale[]>(['es', 'it', 'en', 'fr', 'de', 'pt']);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'logo' | 'favicon'>('logo');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleLocale = (code: SupportedLocale) => {
    if (activeLocales.includes(code)) {
      if (activeLocales.length > 1) {
        setActiveLocales(activeLocales.filter(l => l !== code));
      }
    } else {
      setActiveLocales([...activeLocales, code]);
    }
  };

  const handleOpenMediaFor = (target: 'logo' | 'favicon') => {
    setMediaTarget(target);
    setIsMediaModalOpen(true);
  };

  const handleSave = async () => {
    await updateTenantBranding({
      primaryColor,
      accentColor,
      fontFamily: tenant.branding?.fontFamily || 'Plus Jakarta Sans',
      logoUrl,
      faviconUrl,
      seoTitle,
      seoDescription
    });

    await updateTenant({
      name,
      customDomain
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 text-white max-w-4xl">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Identidad de Marca & Branding Multi-Tenant</h2>
            <p className="text-xs text-slate-400">Personaliza la identidad visual, logotipos, favicons, colores y dominios de tu comercio</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-4 h-4" /> Cambios guardados
          </div>
        )}

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/30 transition"
        >
          <Save className="w-4 h-4" /> Guardar Ajustes
        </button>
      </div>

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logos & Favicon */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <ImageIcon className="w-4 h-4 text-blue-400" /> Logotipo & Favicon Oficial
          </h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Nombre de la Empresa / Comercio:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Logotipo Principal (PNG / WebP / SVG):</label>
            <div className="flex gap-3 items-center">
              <img src={logoUrl} alt="Logo Preview" className="w-12 h-12 rounded-xl object-contain bg-slate-950 border border-slate-800 p-1" />
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                onClick={() => handleOpenMediaFor('logo')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Mediateca
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Favicon del Navegador (ICO / PNG):</label>
            <div className="flex gap-3 items-center">
              <img src={faviconUrl} alt="Favicon Preview" className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-1" />
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
              <button
                onClick={() => handleOpenMediaFor('favicon')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" /> Mediateca
              </button>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Palette className="w-4 h-4 text-amber-400" /> Colores Corporativos de Marca
          </h3>

          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-xs font-bold text-slate-200">Color Primario</div>
              <div className="text-[11px] text-slate-400">Botones principales, enlaces activos y destacados</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-300">{primaryColor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-xs font-bold text-slate-200">Color de Acento</div>
              <div className="text-[11px] text-slate-400">Etiquetas de oferta, badges y elementos de alerta</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-300">{accentColor}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Dominio o Subdominio Asociado:</label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <Globe className="w-4 h-4 text-blue-400" />
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="flex-1 bg-transparent text-white focus:outline-none"
              />
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                SSL Activo
              </span>
            </div>
          </div>
        </div>

        {/* SEO & Meta tags */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" /> SEO Global & Metadatos Dinámicos
          </h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Meta Title de la Tienda (Google):</label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-medium">Meta Description Global:</label>
            <textarea
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        {/* Languages Switcher */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Languages className="w-4 h-4 text-purple-400" /> Idiomas Activos en el Escaparate
          </h3>

          <div className="space-y-2">
            {LANGUAGES.map((lang) => {
              const isEnabled = activeLocales.includes(lang.code);
              return (
                <div
                  key={lang.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{lang.flag}</span>
                    <span className="text-xs font-semibold text-slate-200">{lang.name}</span>
                  </div>
                  <button
                    onClick={() => toggleLocale(lang.code)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      isEnabled
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEnabled ? 'Activado' : 'Desactivado'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        tenantId={tenant.id}
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          if (mediaTarget === 'logo') setLogoUrl(url);
          if (mediaTarget === 'favicon') setFaviconUrl(url);
        }}
      />
    </div>
  );
}
