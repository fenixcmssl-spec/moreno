'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { SaaSPlan, MarketplaceItem } from '@/types';
import { getTranslation } from '@/lib/i18n';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Globe2, 
  Store, 
  Layers, 
  ArrowRight, 
  CreditCard, 
  HelpCircle,
  ExternalLink,
  Lock,
  Boxes,
  Palette,
  ShoppingBag,
  Package,
  Star,
  CheckCircle,
  Download
} from 'lucide-react';

export function SaasLanding() {
  const { 
    plans, 
    marketplaceItems,
    currentLocale, 
    setCurrentRoute, 
    buyLicenseWithPayPal,
    tenant 
  } = useStore();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<SaaSPlan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{ licenseKey: string; storeSlug: string } | null>(null);

  // Marketplace filter
  const [mktFilter, setMktFilter] = useState<'all' | 'plugin' | 'theme'>('all');
  const [selectedAddonModal, setSelectedAddonModal] = useState<MarketplaceItem | null>(null);

  // Purchase Form State
  const [customerName, setCustomerName] = useState('Nuevo Administrador');
  const [customerEmail, setCustomerEmail] = useState('admin@tutienda.com');
  const [storeName, setStoreName] = useState('Mi Tienda Online');
  const [storeSlug, setStoreSlug] = useState('mitienda');

  const handleOpenCheckout = (plan: SaaSPlan) => {
    setSelectedPlanForPurchase(plan);
    setPurchaseSuccessData(null);
    setIsCheckoutModalOpen(true);
  };

  const handleExecutePayPalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPurchase) return;
    setIsProcessingPayment(true);

    try {
      // Simulate PayPal processing delay
      await new Promise(r => setTimeout(r, 1200));
      const res = await buyLicenseWithPayPal(
        selectedPlanForPurchase.id,
        customerName,
        customerEmail,
        billingPeriod,
        storeName,
        storeSlug
      );
      setPurchaseSuccessData({
        licenseKey: res.license.licenseKey,
        storeSlug: res.tenant.slug
      });
    } catch (err) {
      console.error(err);
      alert('Error procesando el pago con PayPal.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const publishedAddons = marketplaceItems.filter(item => {
    if (!item.isPublished) return false;
    if (mktFilter === 'all') return true;
    return item.type === mktFilter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_50%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            {getTranslation(currentLocale, 'saas.hero_badge', 'CMS SaaS Multi-tenant de Última Generación')}
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            {getTranslation(currentLocale, 'saas.hero_title_1', 'Crea, escala y vende con tu propio')}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
              {getTranslation(currentLocale, 'saas.hero_title_2', 'CMS Multi-Dominio + Tienda Integrada')}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            {getTranslation(
              currentLocale, 
              'saas.hero_desc', 
              'La alternativa moderna y más fácil de usar que WordPress. Sistema de licenciamiento SaaS, plugins modulares (Bizum, Redsys, SEO), temas visuales y soporte multi-idioma nativo.'
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#pricing"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              {getTranslation(currentLocale, 'saas.cta_plans', 'Ver Planes & Comprar Licencia')}
            </a>

            <a
              href="#marketplace"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explorar Marketplace ({publishedAddons.length})</span>
            </a>

            <button
              onClick={() => setCurrentRoute('store_front')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4 text-amber-400" />
              {getTranslation(currentLocale, 'saas.cta_demo', 'Explorar Tienda Demo')}
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Quick specs pill row */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-amber-400">100% Multi-Tenant</div>
              <div className="text-xs text-slate-400 mt-0.5">Bases de datos aisladas</div>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-amber-400">PayPal Directo</div>
              <div className="text-xs text-slate-400 mt-0.5">Venta automática de licencias</div>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-amber-400">6 Idiomas</div>
              <div className="text-xs text-slate-400 mt-0.5">ES, IT, EN, FR, DE, PT</div>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800">
              <div className="text-xl font-bold text-amber-400">Fenix All Import</div>
              <div className="text-xs text-slate-400 mt-0.5">Importador CSV / XML / JSON</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {getTranslation(currentLocale, 'saas.features_title', 'Todo lo que necesitas para operar tu negocio de licencias')}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Arquitectura desacoplada en dos partes: el portal comercial para vender licencias y el backoffice operativo para cada comerciante.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 hover:border-amber-500/50 transition">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {getTranslation(currentLocale, 'saas.feature_1_title', 'Aislamiento Multi-Tenant')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getTranslation(currentLocale, 'saas.feature_1_desc', 'Cada cliente cuenta con su propio catálogo, pedidos, base de datos y configuración independiente.')}
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 hover:border-amber-500/50 transition">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {getTranslation(currentLocale, 'saas.feature_2_title', 'Pasarela PayPal Integrada')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getTranslation(currentLocale, 'saas.feature_2_desc', 'Vende licencias mensuales o anuales con activación y provisioning automático del tenant.')}
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 hover:border-amber-500/50 transition">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {getTranslation(currentLocale, 'saas.feature_3_title', 'Ecosistema de Plugins & Temas')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getTranslation(currentLocale, 'saas.feature_3_desc', 'Instala y crea nuevos plugins (Stripe, Correos, Fenix All Import) y temas visuales modulares.')}
            </p>
          </div>

          <div className="bg-slate-800/60 p-6 rounded-xl border border-slate-700/80 hover:border-amber-500/50 transition">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              {getTranslation(currentLocale, 'saas.feature_4_title', 'Multi-idioma Nativo')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getTranslation(currentLocale, 'saas.feature_4_desc', 'Español, Italiano, Inglés, Francés, Alemán y Portugués sin tocar el código central.')}
            </p>
          </div>
        </div>
      </section>

      {/* MARKETPLACE SECTION (PLUGINS & THEMES ON SALE) */}
      <section id="marketplace" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase mb-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Marketplace Oficial de Extensiones</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            Plugins y Temas a la Venta
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Multiplica la potencia de tu tienda con pasarelas de pago, integraciones de IA, logística y plantillas de alta conversión gestionadas por el Super Admin.
          </p>

          {/* Filter Pills */}
          <div className="mt-6 inline-flex p-1 bg-slate-800 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setMktFilter('all')}
              className={`px-4 py-1.5 rounded-md font-semibold transition ${mktFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
            >
              Todos ({marketplaceItems.filter(i => i.isPublished).length})
            </button>
            <button
              onClick={() => setMktFilter('plugin')}
              className={`px-4 py-1.5 rounded-md font-semibold transition ${mktFilter === 'plugin' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
            >
              Plugins & Extensiones
            </button>
            <button
              onClick={() => setMktFilter('theme')}
              className={`px-4 py-1.5 rounded-md font-semibold transition ${mktFilter === 'theme' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'}`}
            >
              Temas Visuales
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedAddons.map(addon => (
            <div 
              key={addon.id} 
              className="bg-slate-800/70 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group shadow-md"
            >
              {addon.previewImage ? (
                <div className="h-44 w-full relative bg-slate-900 overflow-hidden">
                  <img 
                    src={addon.previewImage} 
                    alt={addon.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-sm text-white font-bold text-[10px] uppercase border border-slate-700 shadow">
                      {addon.type === 'theme' ? '🎨 TEMA' : '🔌 PLUGIN'}
                    </span>
                    {addon.badge && (
                      <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase shadow">
                        {addon.badge}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-slate-950/90 text-amber-400 font-extrabold text-sm border border-slate-700 shadow-lg">
                    {addon.price === 0 ? 'GRATIS' : `${addon.price}€`}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-900/50 border-b border-slate-700 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px] uppercase border border-slate-700">
                        {addon.category}
                      </span>
                      {addon.badge && (
                        <span className="ml-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-[10px] uppercase">
                          {addon.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400">
                      {addon.price === 0 ? 'GRATIS' : `${addon.price}€`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {addon.billingType === 'one_time' ? 'Pago Único' : addon.billingType === 'subscription_monthly' ? 'Suscripción/mes' : 'Anual'}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1">
                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition">{addon.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{addon.shortDescription || addon.description}</p>
                
                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Autor: <strong className="text-slate-200">{addon.author}</strong></span>
                  <span>Versión: <strong className="text-slate-200">v{addon.version}</strong></span>
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{addon.rating || 5.0}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border-t border-slate-700/80 flex gap-2">
                <button
                  onClick={() => setSelectedAddonModal(addon)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
                >
                  Ver Ficha Técnica
                </button>
                <button
                  onClick={() => {
                    alert(`¡Excelente! Para instalar "${addon.name}", puedes acceder directamente al panel de tu tienda (/admin > Plugins & Temas) o activarlo desde tu clave de licencia.`);
                  }}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{addon.price === 0 ? 'Instalar Gratis' : `Comprar por ${addon.price}€`}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold text-white">
            {getTranslation(currentLocale, 'saas.pricing_title', 'Planes de Licencia FenixCMS')}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {getTranslation(currentLocale, 'saas.pricing_sub', 'Selecciona el plan ideal para tu tienda o red de comercios electrónicos.')}
          </p>

          {/* Billing Switch */}
          <div className="mt-6 inline-flex items-center p-1 bg-slate-800 rounded-lg border border-slate-700">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                billingPeriod === 'monthly'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {getTranslation(currentLocale, 'saas.monthly', 'Mensual')}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                billingPeriod === 'yearly'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>{getTranslation(currentLocale, 'saas.yearly', 'Anual')}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all ${
                  plan.popular
                    ? 'bg-slate-800/90 border-2 border-amber-500 shadow-2xl shadow-amber-500/10'
                    : 'bg-slate-800/50 border border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 shadow">
                    {plan.badge || 'Más Recomendado'}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-baseline mb-4">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="text-right">
                      <span className="text-3xl font-black text-amber-400">{price}€</span>
                      <span className="text-xs text-slate-400">/mes</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="space-y-3 pb-6 border-b border-slate-700 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Catálogo:</span>
                      <span className="font-bold text-white">{plan.maxProducts.toLocaleString()} productos</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Almacenamiento:</span>
                      <span className="font-bold text-white">{plan.maxStorageMb} MB</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Dominio Propio:</span>
                      <span className="font-bold text-emerald-400">Incluido</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 pt-6 mb-8 text-xs text-slate-300">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wide transition shadow flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {getTranslation(currentLocale, 'saas.buy_with_paypal', 'Comprar Licencia con PayPal')}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add-on Technical Modal */}
      {selectedAddonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setSelectedAddonModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{selectedAddonModal.name}</h3>
                <p className="text-xs text-slate-400">{selectedAddonModal.type === 'theme' ? 'Tema Visual Fenix' : 'Plugin / Extensión'}</p>
              </div>
            </div>

            {selectedAddonModal.previewImage && (
              <img src={selectedAddonModal.previewImage} alt={selectedAddonModal.name} className="w-full h-48 object-cover rounded-xl mb-4 border border-slate-800" />
            )}

            <div className="space-y-3 text-xs text-slate-300">
              <p className="leading-relaxed">{selectedAddonModal.description}</p>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div>
                  <span className="text-slate-500 block text-[10px]">PRECIO:</span>
                  <span className="text-amber-400 font-bold text-sm">{selectedAddonModal.price === 0 ? 'GRATIS' : `${selectedAddonModal.price}€`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MODO DE FACTURACIÓN:</span>
                  <span className="text-white capitalize">{selectedAddonModal.billingType === 'one_time' ? 'Pago Único' : 'Suscripción'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">DESARROLLADOR:</span>
                  <span className="text-white">{selectedAddonModal.author}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">VERSIÓN:</span>
                  <span className="text-white">{selectedAddonModal.version}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedAddonModal(null)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setSelectedAddonModal(null);
                  alert(`Puedes instalar "${selectedAddonModal.name}" desde tu panel de tienda (/admin > Plugins)`);
                }}
                className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow text-xs"
              >
                Obtener Add-on
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout with PayPal Modal */}
      {isCheckoutModalOpen && selectedPlanForPurchase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            {!purchaseSuccessData ? (
              <form onSubmit={handleExecutePayPalPayment} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <div className="p-2 bg-[#003087]/20 border border-[#003087] rounded-lg">
                    <span className="font-extrabold text-[#0079C1] text-sm italic">Pay</span>
                    <span className="font-extrabold text-[#00457C] text-sm italic">Pal</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Checkout de Licencia FenixCMS</h3>
                    <p className="text-xs text-slate-400">Plan: <span className="text-amber-400 font-semibold">{selectedPlanForPurchase.name}</span> ({billingPeriod === 'monthly' ? `${selectedPlanForPurchase.priceMonthly}€/mes` : `${selectedPlanForPurchase.priceYearly}€/año`})</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre del Cliente / Titular</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email del Propietario</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre de la Nueva Tienda</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={e => {
                        setStoreName(e.target.value);
                        setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Subdominio / Slug</label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        required
                        value={storeSlug}
                        onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 ml-1">.com</span>
                    </div>
                  </div>
                </div>

                {/* Plan Summary Box */}
                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan Seleccionado:</span>
                    <span className="font-bold text-white">{selectedPlanForPurchase.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Periodo de Facturación:</span>
                    <span className="text-amber-400 font-semibold capitalize">{billingPeriod === 'monthly' ? 'Mensual' : 'Anual'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="font-bold text-white">Total a Pagar hoy:</span>
                    <span className="font-black text-amber-400 text-base">
                      {billingPeriod === 'monthly' ? `${selectedPlanForPurchase.priceMonthly}€` : `${selectedPlanForPurchase.priceYearly}€`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Pasarela de Pago:</span>
                    <span className="text-blue-400 font-semibold">PayPal Commerce (Suscripción Segura)</span>
                  </div>
                </div>

                {/* PayPal Action Button */}
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Conectando con PayPal y aprovisionando Storefront...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-extrabold italic text-amber-300">Pay</span>
                      <span className="font-extrabold italic text-white">Pal</span>
                      <span>— Pagar {billingPeriod === 'monthly' ? `${selectedPlanForPurchase.priceMonthly}€` : `${selectedPlanForPurchase.priceYearly}€`} y Activar Tienda</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">¡Licencia FenixCMS Activada con Éxito!</h3>
                <p className="text-xs text-slate-300">
                  Tu tienda <span className="text-amber-400 font-semibold">{storeName}</span> ha sido provisionada en Firestore y está lista para ser administrada.
                </p>

                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-left font-mono text-xs space-y-1">
                  <div className="text-slate-400 text-[10px]">CLAVE DE LICENCIA GENERADA:</div>
                  <div className="text-emerald-400 font-bold select-all">{purchaseSuccessData.licenseKey}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsCheckoutModalOpen(false);
                      setCurrentRoute('store_admin');
                    }}
                    className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                  >
                    Ir al Backoffice ({storeSlug}.com/admin)
                  </button>
                  <button
                    onClick={() => {
                      setIsCheckoutModalOpen(false);
                      setCurrentRoute('store_front');
                    }}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
                  >
                    Ver Escaparate Fenix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 FenixCMS SaaS Platform. Todos los derechos reservados. Arquitectura Multi-tenant & E-commerce.</p>
      </footer>
    </div>
  );
}
