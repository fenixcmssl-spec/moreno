'use client';

import React, { useState, Suspense, useMemo } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/storeContext';
import { ProductItem, SupportedLocale } from '@/types';
import { 
  getTranslation, 
  getProductTitle, 
  getProductDescription, 
  getProductCategory, 
  getProductAttribute, 
  LANGUAGES 
} from '@/lib/i18n';
import { SeoAutomationService } from '@/lib/services/seo-automation.service';
import { 
  Search, 
  ShoppingCart, 
  MapPin, 
  ChevronDown, 
  Star, 
  Truck, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Globe 
} from 'lucide-react';
import { StorefrontCheckout } from './StorefrontCheckout';
import { StorefrontProductGrid } from './StorefrontProductGrid';
import { StorefrontCategoriesMenu } from './StorefrontCategoriesMenu';
import { StorefrontHeroBanner } from './StorefrontHeroBanner';
import { StorefrontBlogFeed } from './StorefrontBlogFeed';
import { 
  HeroBannerSkeleton, 
  CategoriesMenuSkeleton, 
  ProductGridSkeleton, 
  BlogFeedSkeleton 
} from './StorefrontSkeletons';

export function FenixStorefront() {
  const { 
    tenant, 
    products, 
    blogPosts,
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity,
    currentLocale,
    setCurrentLocale,
    setCurrentRoute,
    selectedProductForModal,
    setSelectedProductForModal
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  const baseCategories = useMemo(() => ['all', 'Electrónica', 'Hogar y Cocina', 'Informática', 'Moda y Ropa'], []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const locTitle = getProductTitle(p, currentLocale).toLowerCase();
      const locDesc = getProductDescription(p, currentLocale).toLowerCase();
      const locCat = getProductCategory(p.category, currentLocale).toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || locTitle.includes(q) || locDesc.includes(q) || locCat.includes(q) || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0; // default featured
    });
  }, [products, currentLocale, searchQuery, selectedCategory, sortBy]);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingNeeded = Math.max(0, tenant.settings.freeShippingThreshold - cartSubtotal);

  const siteBaseUrl = typeof window !== 'undefined' ? window.location.origin : `https://${tenant.customDomain || tenant.slug + '.fenixcms.es'}`;
  const dynamicSchema = selectedProductForModal 
    ? SeoAutomationService.generateProductSchema(selectedProductForModal, tenant, siteBaseUrl)
    : SeoAutomationService.generateStoreSchema(tenant, siteBaseUrl);

  const handleBuyNow = (prod: ProductItem) => {
    addToCart(prod, 1);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#eaeded] text-slate-900 font-sans">
      
      {/* Dynamic Schema.org JSON-LD for Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dynamicSchema) }}
      />
      
      {/* 1. FENIX STOREFRONT TOP HEADER */}
      <header className="bg-[#131921] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs">
          
          {/* Logo */}
          <div 
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="flex items-center gap-1.5 cursor-pointer py-1 px-2 border border-transparent hover:border-white rounded transition"
          >
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-white flex items-center">
                {tenant.name.split(' ')[0]}
                <span className="text-amber-400 font-extrabold ml-0.5">{tenant.name.split(' ').slice(1).join(' ') || 'Store'}</span>
              </span>
              <span className="text-[10px] text-amber-400 font-semibold tracking-wider -mt-1 font-mono">
                .com / escaparate
              </span>
            </div>
          </div>

          {/* Deliver to Location */}
          <div className="hidden md:flex items-center gap-1.5 py-1 px-2 border border-transparent hover:border-white rounded cursor-pointer transition text-slate-200">
            <MapPin className="w-4 h-4 text-white flex-shrink-0" />
            <div className="leading-tight">
              <div className="text-[10px] text-slate-400">{getTranslation(currentLocale, 'store.deliver_to')}</div>
              <div className="font-bold text-white">{getTranslation(currentLocale, 'store.country_default')}</div>
            </div>
          </div>

          {/* Mega Search Bar */}
          <div className="flex-1 max-w-3xl flex items-center h-10 rounded-md overflow-hidden bg-white shadow-inner focus-within:ring-2 focus-within:ring-amber-500">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-2.5 font-medium border-r border-slate-300 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
            >
              {baseCategories.map(cat => (
                <option key={cat} value={cat}>
                  {getProductCategory(cat, currentLocale)}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder={getTranslation(currentLocale, 'store.search_placeholder', `Buscar en ${tenant.name}...`)}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 h-full px-3 text-slate-900 text-sm focus:outline-none"
            />

            <button
              onClick={() => {}}
              className="h-full px-5 bg-[#febd69] hover:bg-[#f3a847] text-slate-950 flex items-center justify-center transition cursor-pointer"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Language Selector Dropdown in Header */}
          <div className="flex items-center gap-1.5 py-1 px-2 border border-transparent hover:border-white rounded cursor-pointer text-slate-200 relative bg-slate-800/60">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={currentLocale}
              onChange={e => setCurrentLocale(e.target.value as SupportedLocale)}
              className="bg-transparent text-white font-bold text-xs uppercase cursor-pointer focus:outline-none appearance-none pr-4"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white font-normal">
                  {lang.flag} {lang.name} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
          </div>

          {/* Customer Login / Account */}
          <div 
            onClick={() => setCurrentRoute('store_login')}
            className="hidden sm:flex flex-col py-1 px-2 border border-transparent hover:border-white rounded cursor-pointer leading-tight transition text-left"
          >
            <span className="text-[10px] text-slate-400">{getTranslation(currentLocale, 'store.account_greeting')}</span>
            <span className="font-bold text-white flex items-center gap-0.5">
              {getTranslation(currentLocale, 'store.account_and_lists')} <ChevronDown className="w-3 h-3 text-slate-400" />
            </span>
          </div>

          {/* Cart Icon & Total */}
          <div 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 py-1 px-2.5 border border-transparent hover:border-white rounded cursor-pointer relative transition bg-slate-800/40"
          >
            <div className="relative">
              <ShoppingCart className="w-7 h-7 text-white" />
              <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 font-black text-xs px-1.5 py-0.2 rounded-full shadow">
                {cartItemsCount}
              </span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left">
              <span className="text-[10px] text-slate-400">{getTranslation(currentLocale, 'store.cart')}</span>
              <span className="font-extrabold text-amber-400 text-xs">{cartSubtotal.toFixed(2)}€</span>
            </div>
          </div>

        </div>

        {/* 2. SECONDARY DEPARTMENTS SUB-NAV BAR (Wrapped in Suspense) */}
        <Suspense fallback={<CategoriesMenuSkeleton />}>
          <StorefrontCategoriesMenu
            categories={baseCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            currentLocale={currentLocale}
            onOpenAdmin={() => setCurrentRoute('store_admin')}
            tenantSlug={tenant.slug}
          />
        </Suspense>
      </header>

      {/* 3. HERO / FLASH DEALS BANNER (Wrapped in Suspense) */}
      <Suspense fallback={<HeroBannerSkeleton />}>
        <StorefrontHeroBanner
          currentLocale={currentLocale}
          freeShippingThreshold={tenant.settings.freeShippingThreshold}
        />
      </Suspense>

      {/* 4. MAIN PRODUCT CATALOG (FENIX HIGH CONVERSION DENSE GRID with React Suspense) */}
      <main className="max-w-[1500px] mx-auto px-4 py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-300 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedCategory === 'all' 
                ? getTranslation(currentLocale, 'store.featured_catalog_title') 
                : `${getTranslation(currentLocale, 'store.category_label')} ${getProductCategory(selectedCategory, currentLocale)}`}
            </h2>
            <p className="text-xs text-slate-500">
              {getTranslation(currentLocale, 'store.showing_items')} ({filteredProducts.length})
            </p>
          </div>
          
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="font-semibold">{getTranslation(currentLocale, 'store.sort_by')}</span>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="featured">{getTranslation(currentLocale, 'store.sort_featured')}</option>
              <option value="price_asc">{getTranslation(currentLocale, 'store.sort_price_low')}</option>
              <option value="price_desc">{getTranslation(currentLocale, 'store.sort_price_high')}</option>
              <option value="rating">{getTranslation(currentLocale, 'store.sort_rating')}</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid wrapped in Suspense with Skeleton Fallback */}
        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          <StorefrontProductGrid
            products={filteredProducts}
            currentLocale={currentLocale}
            onSelectProduct={setSelectedProductForModal}
            onAddToCart={addToCart}
            onBuyNow={handleBuyNow}
          />
        </Suspense>

        {/* Blog & Content Feed Section wrapped in Suspense */}
        <Suspense fallback={<BlogFeedSkeleton />}>
          <StorefrontBlogFeed
            posts={blogPosts || []}
            currentLocale={currentLocale}
          />
        </Suspense>

      </main>

      {/* 5. PRODUCT DETAILS MODAL (FULL LOCALIZED TITLE, DESCRIPTION, SPECS & ATTRIBUTES) */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setSelectedProductForModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-1.5 rounded-full bg-slate-100 transition hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Gallery with Next.js Image */}
              <div className="space-y-3">
                <div className="relative aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                  <Image
                    src={selectedProductForModal.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}
                    alt={getProductTitle(selectedProductForModal, currentLocale)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    referrerPolicy="no-referrer"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Info & Buy Box */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {getProductCategory(selectedProductForModal.category, currentLocale)} • SKU: {selectedProductForModal.sku}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug">
                    {getProductTitle(selectedProductForModal, currentLocale)}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <span className="font-semibold text-slate-700">{selectedProductForModal.rating}</span>
                    <span className="text-slate-400">({selectedProductForModal.reviewsCount} {getTranslation(currentLocale, 'store.reviews_count')})</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-950">{selectedProductForModal.price.toFixed(2)}€</span>
                    {selectedProductForModal.compareAtPrice && (
                      <span className="text-sm text-slate-400 line-through">
                        {selectedProductForModal.compareAtPrice.toFixed(2)}€
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1">
                    {getTranslation(currentLocale, 'store.in_stock')} ({selectedProductForModal.stock} {getTranslation(currentLocale, 'store.units_available')})
                  </div>
                </div>

                {/* Fully Localized Description */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {getTranslation(currentLocale, 'merchant.products', 'Descripción')}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    {getProductDescription(selectedProductForModal, currentLocale)}
                  </p>
                </div>

                {/* Localized Attributes */}
                {selectedProductForModal.attributes && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedProductForModal.attributes.brand && (
                      <div>
                        <span className="text-slate-400">{getTranslation(currentLocale, 'store.brand')}</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {getProductAttribute(selectedProductForModal.id, 'brand', selectedProductForModal.attributes.brand, currentLocale)}
                        </span>
                      </div>
                    )}
                    {selectedProductForModal.attributes.color && (
                      <div>
                        <span className="text-slate-400">{getTranslation(currentLocale, 'store.color')}</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {getProductAttribute(selectedProductForModal.id, 'color', selectedProductForModal.attributes.color, currentLocale)}
                        </span>
                      </div>
                    )}
                    {selectedProductForModal.attributes.warranty && (
                      <div>
                        <span className="text-slate-400">{getTranslation(currentLocale, 'store.warranty')}</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {getProductAttribute(selectedProductForModal.id, 'warranty', selectedProductForModal.attributes.warranty, currentLocale)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      addToCart(selectedProductForModal, 1);
                      setSelectedProductForModal(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-bold text-xs transition shadow cursor-pointer"
                  >
                    {getTranslation(currentLocale, 'store.add_to_cart')}
                  </button>
                  <button
                    onClick={() => {
                      addToCart(selectedProductForModal, 1);
                      setSelectedProductForModal(null);
                      setIsCheckoutOpen(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#ffa41c] hover:bg-[#fa8900] text-slate-950 font-bold text-xs transition shadow cursor-pointer"
                  >
                    {getTranslation(currentLocale, 'store.buy_now')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SLIDE-OUT CART DRAWER with Next.js Image Optimization */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-5 text-left">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-slate-800" />
                  <h3 className="text-base font-bold text-slate-900">
                    {getTranslation(currentLocale, 'store.cart_title')} ({cartItemsCount})
                  </h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Free shipping progress bar */}
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                {freeShippingNeeded <= 0 ? (
                  <div className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> {getTranslation(currentLocale, 'store.free_shipping_achieved')}
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-700">{getTranslation(currentLocale, 'store.free_shipping_progress')} </span>
                    <span className="font-bold text-amber-700">{freeShippingNeeded.toFixed(2)}€</span>
                    <span className="text-slate-700"> {getTranslation(currentLocale, 'store.free_shipping_progress_tail')}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {getTranslation(currentLocale, 'store.empty_cart')}
                  </div>
                ) : (
                  cart.map((item) => {
                    const locTitle = getProductTitle(item.product, currentLocale);
                    return (
                      <div key={item.product.id} className="flex gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200">
                          <Image
                            src={item.product.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'}
                            alt={locTitle}
                            fill
                            sizes="64px"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate" title={locTitle}>{locTitle}</h4>
                          <div className="text-xs font-extrabold text-amber-600 mt-0.5">
                            {item.product.price.toFixed(2)}€
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-slate-300 rounded bg-white">
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 font-bold text-xs text-slate-800">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Eliminar artículo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-slate-600">{getTranslation(currentLocale, 'store.subtotal')}:</span>
                  <span className="text-xl font-black text-slate-900">{cartSubtotal.toFixed(2)}€</span>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 rounded-full bg-[#ffd814] hover:bg-[#f7ca00] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                >
                  {getTranslation(currentLocale, 'store.checkout_cta')} ({cartSubtotal.toFixed(2)}€)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CHECKOUT MODAL (WITH PAYPAL, STRIPE, CORREOS, BANK TRANSFER, COD) */}
      {isCheckoutOpen && (
        <StorefrontCheckout onClose={() => setIsCheckoutOpen(false)} />
      )}

    </div>
  );
}
