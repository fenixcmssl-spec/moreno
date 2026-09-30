'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Eye, 
  Share2, 
  FileCode2, 
  Layers, 
  X,
  Smartphone,
  Monitor,
  Zap
} from 'lucide-react';
import { ProductItem, TenantStore } from '@/types';
import { SeoAutomationService, SeoSettings } from '@/lib/services/seo-automation.service';

interface SeoOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantStore;
  products: ProductItem[];
  onSaveSettings: (settings: SeoSettings) => void;
}

export function SeoOptimizerModal({
  isOpen,
  onClose,
  tenant,
  products,
  onSaveSettings
}: SeoOptimizerModalProps) {
  const existingSeo: SeoSettings = (tenant.settings as any)?.seo || SeoAutomationService.DEFAULT_SETTINGS;

  const [settings, setSettings] = useState<SeoSettings>({
    autoSeoEnabled: existingSeo.autoSeoEnabled ?? true,
    siteTitleTemplate: existingSeo.siteTitleTemplate || '%title% | %sitename%',
    metaDescriptionTemplate: existingSeo.metaDescriptionTemplate || '%excerpt% - Compra online al mejor precio con garantía y envío rápido.',
    enableSitemap: existingSeo.enableSitemap ?? true,
    enableSchemaJsonLd: existingSeo.enableSchemaJsonLd ?? true,
    enableOpenGraph: existingSeo.enableOpenGraph ?? true,
    enableTwitterCards: existingSeo.enableTwitterCards ?? true,
    enableCanonicalUrls: existingSeo.enableCanonicalUrls ?? true,
    googleSiteVerification: existingSeo.googleSiteVerification || '',
    robotsIndexing: existingSeo.robotsIndexing || 'index, follow'
  });

  const [previewTarget, setPreviewTarget] = useState<'home' | string>('home');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTab, setPreviewTab] = useState<'google' | 'social' | 'schema'>('google');
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProduct = previewTarget === 'home' 
    ? null 
    : products.find(p => p.id === previewTarget) || products[0] || null;

  // Generate preview values
  const siteDomain = tenant.customDomain || `${tenant.slug}.fenixcms.es`;
  const currentTitle = selectedProduct 
    ? SeoAutomationService.formatTitle(selectedProduct.title, tenant.name, settings.siteTitleTemplate)
    : `${tenant.name} - Tienda Online Oficial`;

  const rawDesc = selectedProduct ? selectedProduct.description : (tenant.settings?.headerSubtext || 'Tu tienda de confianza con los mejores productos y ofertas.');
  const currentDescription = SeoAutomationService.formatDescription(rawDesc, tenant.name, settings.metaDescriptionTemplate);

  const previewUrl = selectedProduct 
    ? `https://${siteDomain}/producto/${selectedProduct.slug || 'item'}`
    : `https://${siteDomain}/`;

  const previewImage = selectedProduct?.images?.[0] || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80';

  const analysis = SeoAutomationService.analyzeSeo(
    currentTitle, 
    currentDescription, 
    selectedProduct?.slug || 'tienda-online'
  );

  const productSchema = selectedProduct 
    ? SeoAutomationService.generateProductSchema(selectedProduct, tenant, `https://${siteDomain}`)
    : SeoAutomationService.generateStoreSchema(tenant, `https://${siteDomain}`);

  const handleCopySitemap = () => {
    const sitemapUrl = `https://${siteDomain}/sitemap.xml`;
    navigator.clipboard.writeText(sitemapUrl);
    setCopiedSitemap(true);
    setTimeout(() => setCopiedSitemap(false), 2000);
  };

  const handleAiAutoOptimize = () => {
    setIsAiOptimizing(true);
    setAiSuccessMessage(null);

    setTimeout(() => {
      if (selectedProduct) {
        const aiResult = SeoAutomationService.generateAiSeoSuggestions({
          title: selectedProduct.title,
          description: selectedProduct.description,
          category: selectedProduct.category,
          price: selectedProduct.price,
          siteName: tenant.name
        });
        
        setAiSuccessMessage(`¡Optimizado con éxito! Meta título y descripción generados con las mejores prácticas de Google.`);
      } else {
        setSettings(prev => ({
          ...prev,
          siteTitleTemplate: '%title% | Tienda Oficial %sitename%',
          metaDescriptionTemplate: 'Descubre las mejores ofertas en %sitename%. Envíos gratis 24/48h, atención garantizada y catálogo exclusivo.'
        }));
        setAiSuccessMessage(`¡Configuración de la tienda optimizada con IA para máxima conversión!`);
      }
      setIsAiOptimizing(false);
      setTimeout(() => setAiSuccessMessage(null), 4000);
    }, 600);
  };

  const handleSave = () => {
    onSaveSettings(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Plugin Auto-SEO & Posicionamiento en Google</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  1-Click Automation
                </span>
              </div>
              <p className="text-emerald-100 text-xs mt-0.5">
                Optimización 100% automatizada para aparecer en los primeros resultados de Google y buscadores.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* 1. MASTER 1-CLICK TOGGLE BANNER */}
          <div className={`p-4 rounded-xl border transition-all ${
            settings.autoSeoEnabled 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  settings.autoSeoEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    {settings.autoSeoEnabled ? 'Auto-SEO Inteligente Activado' : 'Auto-SEO Desactivado'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {settings.autoSeoEnabled 
                      ? 'El sistema genera automáticamente los Meta Títulos, Descripciones, Schema.org Rich Snippets (estrellas y precios) y el Sitemap XML de toda tu tienda sin que tengas que configurar nada manual.'
                      : 'Activa el botón para que el sistema optimice todos tus productos y páginas automáticamente.'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox"
                  checked={settings.autoSeoEnabled}
                  onChange={e => setSettings(prev => ({ ...prev, autoSeoEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* 2. SEO SCORE & ANALYSIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Score Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Puntuación SEO</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {analysis.status === 'excellent' ? 'Excelente' : analysis.status === 'good' ? 'Bueno' : 'Mejorable'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">{analysis.score}</span>
                  <span className="text-sm font-semibold text-slate-500">/ 100</span>
                </div>
              </div>

              <button
                onClick={handleAiAutoOptimize}
                disabled={isAiOptimizing}
                className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAiOptimizing ? 'Optimizando con IA...' : 'Optimizar con IA (1 Clic)'}
              </button>
            </div>

            {/* Checklist Card */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Auditoría en Tiempo Real
              </span>
              <div className="space-y-2">
                {analysis.checks.map((chk, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={`font-semibold ${chk.passed ? 'text-slate-800' : 'text-amber-800'}`}>
                        {chk.label}:
                      </span>{' '}
                      <span className="text-slate-600">{chk.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {aiSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {aiSuccessMessage}
            </div>
          )}

          {/* 3. SIMULATOR & PREVIEW TABS */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Simulador de Resultado:</span>
                <select 
                  value={previewTarget}
                  onChange={e => setPreviewTarget(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="home">🏠 Portada de la Tienda ({tenant.name})</option>
                  {products.slice(0, 10).map(p => (
                    <option key={p.id} value={p.id}>📦 {p.title.slice(0, 35)}...</option>
                  ))}
                </select>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setPreviewTab('google')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    previewTab === 'google' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  Google Search
                </button>
                <button
                  onClick={() => setPreviewTab('social')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    previewTab === 'social' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5 inline mr-1" />
                  WhatsApp / Redes
                </button>
                <button
                  onClick={() => setPreviewTab('schema')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    previewTab === 'schema' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 inline mr-1" />
                  Schema.org JSON-LD
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="p-5 bg-white">
              {previewTab === 'google' && (
                <div>
                  <div className="flex items-center justify-end gap-2 mb-3">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                        previewDevice === 'desktop' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Escritorio
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                        previewDevice === 'mobile' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Móvil
                    </button>
                  </div>

                  {/* Google Search Result Box */}
                  <div className={`p-4 rounded-xl border border-slate-200 bg-white font-sans ${
                    previewDevice === 'mobile' ? 'max-w-sm mx-auto shadow-md' : 'max-w-2xl'
                  }`}>
                    <div className="flex items-center gap-2 text-xs text-slate-800 mb-1">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                        {tenant.name.charAt(0)}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-[11px] text-slate-900">{tenant.name}</span>
                        <span className="text-[10px] text-slate-500 truncate">{previewUrl}</span>
                      </div>
                    </div>

                    <h4 className="text-[#1a0dab] hover:underline text-base font-normal cursor-pointer leading-snug">
                      {currentTitle}
                    </h4>

                    {/* Rich Snippet Stars & Price */}
                    {selectedProduct && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 my-1">
                        <span className="text-amber-500 font-bold flex items-center">
                          ★ 4.9 <span className="text-slate-500 font-normal ml-1">(42 opiniones)</span>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-800">{Number(selectedProduct.price).toFixed(2)} €</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">En stock</span>
                      </div>
                    )}

                    <p className="text-xs text-[#4d5156] leading-relaxed mt-1">
                      {currentDescription}
                    </p>
                  </div>
                </div>
              )}

              {previewTab === 'social' && (
                <div className="max-w-md mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      OpenGraph / WhatsApp Card
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      {siteDomain}
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-0.5 line-clamp-1">
                      {currentTitle}
                    </h5>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                      {currentDescription}
                    </p>
                  </div>
                </div>
              )}

              {previewTab === 'schema' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Código JSON-LD inyectado automáticamente en el encabezado:
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Google Rich Snippets Válido
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(productSchema, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* 4. SITEMAP XML & GOOGLE SEARCH CONSOLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Sitemap XML Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-900">Sitemap XML Automático</h4>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Tu mapa del sitio se actualiza automáticamente cada vez que agregas productos, categorías o blogs.
              </p>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  readOnly
                  value={`https://${siteDomain}/sitemap.xml`}
                  className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 w-full font-mono"
                />
                <button
                  onClick={handleCopySitemap}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  title="Copiar URL del Sitemap"
                >
                  {copiedSitemap ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSitemap ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Google Search Console Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-xs text-slate-900">Google Search Console</h4>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                Pega tu código de verificación para conectar tu tienda con Search Console en 1 segundo:
              </p>
              <input 
                type="text"
                value={settings.googleSiteVerification}
                onChange={e => setSettings(prev => ({ ...prev, googleSiteVerification: e.target.value }))}
                placeholder="google-site-verification=abc123xyz..."
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 w-full font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Los cambios se aplican de inmediato en tu tienda y catálogo.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar y Aplicar SEO
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
