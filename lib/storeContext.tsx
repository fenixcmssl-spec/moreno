'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  DomainRoute, 
  SupportedLocale, 
  SaaSPlan, 
  SaaSLicense, 
  TenantStore, 
  ProductItem, 
  StoreOrder, 
  PluginDefinition, 
  ThemeDefinition, 
  CartItem,
  MarketplaceItem
} from '@/types';
import { 
  INITIAL_PLANS, 
  INITIAL_LICENSES, 
  INITIAL_TENANT, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_PLUGINS, 
  INITIAL_THEMES,
  INITIAL_MARKETPLACE_ITEMS
} from './initialData';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

interface StoreContextType {
  currentRoute: DomainRoute;
  setCurrentRoute: (route: DomainRoute) => void;
  currentLocale: SupportedLocale;
  setCurrentLocale: (locale: SupportedLocale) => void;
  
  // Auth state
  isAuthenticated: boolean;
  currentUser: { email: string; name: string; role: 'super_admin' | 'merchant_admin' } | null;
  loginBackend: (email: string, pass: string) => { success: boolean; error?: string };
  logoutBackend: () => void;
  
  // Data state
  plans: SaaSPlan[];
  licenses: SaaSLicense[];
  tenant: TenantStore;
  products: ProductItem[];
  orders: StoreOrder[];
  plugins: PluginDefinition[];
  themes: ThemeDefinition[];
  activeTheme: ThemeDefinition;
  marketplaceItems: MarketplaceItem[];
  
  // Cart
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: ProductItem, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Product Modal
  selectedProductForModal: ProductItem | null;
  setSelectedProductForModal: (product: ProductItem | null) => void;
  
  // Mutations
  buyLicenseWithPayPal: (
    planId: string, 
    customerName: string, 
    customerEmail: string, 
    billingPeriod: 'monthly' | 'yearly', 
    storeName: string, 
    storeSlug: string
  ) => Promise<{ success: boolean; license: SaaSLicense; tenant: TenantStore }>;
  
  toggleLicenseStatus: (licenseId: string, status: 'active' | 'suspended' | 'expired') => void;
  updateLicense: (licenseId: string, updates: Partial<SaaSLicense>) => Promise<void>;
  createLicense: (licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>) => Promise<SaaSLicense>;
  updatePlan: (planId: string, updates: Partial<SaaSPlan>) => Promise<void>;
  
  // Marketplace items CRUD
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => Promise<MarketplaceItem>;
  updateMarketplaceItem: (id: string, updates: Partial<MarketplaceItem>) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
  
  addProduct: (product: Omit<ProductItem, 'id' | 'createdAt'>) => Promise<ProductItem>;
  updateProduct: (productId: string, updates: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  
  createOrder: (orderData: Omit<StoreOrder, 'id' | 'orderNumber' | 'createdAt'>) => Promise<StoreOrder>;
  updateOrderStatus: (orderId: string, updates: Partial<StoreOrder>) => Promise<void>;
  
  togglePlugin: (pluginId: string) => Promise<void>;
  updatePluginConfig: (pluginId: string, config: Record<string, any>) => Promise<void>;
  installNewPlugin: (plugin: PluginDefinition) => Promise<void>;
  
  setActiveThemeId: (themeId: string) => void;
  installNewTheme: (theme: ThemeDefinition) => Promise<void>;
  
  importProductsBatch: (products: Partial<ProductItem>[]) => Promise<{ importedCount: number }>;
  resetToDemoData: () => void;
  isDbConnected: boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<DomainRoute>('saas_landing');
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>('es');

  // Backend Authentication State with lazy local storage reading
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const savedAuth = localStorage.getItem('fenix_backend_auth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        return Boolean(parsed && parsed.email);
      }
    } catch {
      return false;
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: 'super_admin' | 'merchant_admin' } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedAuth = localStorage.getItem('fenix_backend_auth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed && parsed.email) return parsed;
      }
    } catch {
      return null;
    }
    return null;
  });

  const loginBackend = (inputEmail: string, inputPass: string) => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPass = inputPass.trim();

    // Required Super Admin credentials requested by user
    if (cleanEmail === 'info@fenixcms.es' && cleanPass === 'Patricia1980@') {
      const user = {
        email: 'info@fenixcms.es',
        name: 'Super Administrador FenixCMS',
        role: 'super_admin' as const
      };
      setIsAuthenticated(true);
      setCurrentUser(user);
      try {
        localStorage.setItem('fenix_backend_auth', JSON.stringify(user));
      } catch {}
      return { success: true };
    }

    // Also support merchant store admin access if matching store email
    if (cleanEmail === tenant.ownerEmail.toLowerCase() && (cleanPass === 'Patricia1980@' || cleanPass === tenant.licenseKey || cleanPass === 'admin123')) {
      const user = {
        email: tenant.ownerEmail,
        name: tenant.ownerName || 'Administrador Tienda',
        role: 'merchant_admin' as const
      };
      setIsAuthenticated(true);
      setCurrentUser(user);
      try {
        localStorage.setItem('fenix_backend_auth', JSON.stringify(user));
      } catch {}
      return { success: true };
    }

    return { 
      success: false, 
      error: 'Credenciales no válidas. El usuario debe ser info@fenixcms.es con su contraseña de acceso asignada.' 
    };
  };

  const logoutBackend = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('fenix_backend_auth');
    } catch {}
  };
  
  const [plans, setPlans] = useState<SaaSPlan[]>(INITIAL_PLANS);
  const [licenses, setLicenses] = useState<SaaSLicense[]>(INITIAL_LICENSES);
  const [tenant, setTenant] = useState<TenantStore>(INITIAL_TENANT);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<StoreOrder[]>(INITIAL_ORDERS);
  const [plugins, setPlugins] = useState<PluginDefinition[]>(INITIAL_PLUGINS);
  const [themes, setThemes] = useState<ThemeDefinition[]>(INITIAL_THEMES);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
  const [activeThemeId, setActiveThemeIdState] = useState<string>('theme_fenix_market');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductItem | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // Sync initial setup with Firestore if possible
  useEffect(() => {
    async function syncFromCloud() {
      try {
        const tenantRef = doc(db, 'tenants', 'tenant_demo');
        const snap = await getDoc(tenantRef);
        if (snap.exists()) {
          setTenant(snap.data() as TenantStore);
        }
      } catch (err) {
        console.warn('Firestore initial read notice:', err);
      }
    }
    syncFromCloud();
  }, []);

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  const setActiveThemeId = (id: string) => {
    setActiveThemeIdState(id);
    setTenant(prev => ({ ...prev, themeId: id }));
  };

  // Cart actions
  const addToCart = (product: ProductItem, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setCart([]);

  // Buy License via PayPal
  const buyLicenseWithPayPal = async (
    planId: string, 
    customerName: string, 
    customerEmail: string, 
    billingPeriod: 'monthly' | 'yearly', 
    storeName: string, 
    storeSlug: string
  ) => {
    const selectedPlan = plans.find(p => p.id === planId) || plans[1];
    const generatedLicenseKey = `FNX-${planId.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}-${storeSlug.toUpperCase().slice(0, 6)}`;
    const newLicenseId = `lic_${Date.now()}`;
    const newTenantId = `tenant_${storeSlug.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const newLicense: SaaSLicense = {
      id: newLicenseId,
      licenseKey: generatedLicenseKey,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      status: 'active',
      customerName,
      customerEmail,
      tenantSlug: storeSlug,
      tenantName: storeName,
      price: billingPeriod === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly,
      billingPeriod,
      paymentProvider: 'paypal',
      transactionId: `PP-TX-${Date.now()}`,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxProducts: selectedPlan.maxProducts,
      maxStorageMb: selectedPlan.maxStorageMb,
      createdAt: new Date().toISOString()
    };

    const newTenantStore: TenantStore = {
      id: newTenantId,
      name: storeName,
      slug: storeSlug,
      domain: `${storeSlug}.fenixcms.es`,
      customDomain: `${storeSlug}.com`,
      status: 'active',
      planId: selectedPlan.id,
      licenseKey: generatedLicenseKey,
      ownerEmail: customerEmail,
      ownerName: customerName,
      themeId: 'theme_fenix_market',
      currency: 'EUR',
      defaultLocale: currentLocale,
      supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
      settings: {
        storeName: storeName,
        tagline: 'Tu nueva tienda online con tecnología FenixCMS',
        supportEmail: customerEmail,
        phone: '+34 600 000 000',
        address: 'Sede Principal, Madrid',
        taxRate: 21,
        shippingBaseCost: 3.99,
        freeShippingThreshold: 30.00
      },
      activePlugins: [
        'plugin_paypal',
        'plugin_stripe',
        'plugin_bank_transfer',
        'plugin_cash_on_delivery',
        'plugin_correos',
        'plugin_fenix_import'
      ],
      createdAt: new Date().toISOString()
    };

    setLicenses(prev => [newLicense, ...prev]);
    setTenant(newTenantStore);

    // Save to Firestore asynchronously
    try {
      await setDoc(doc(db, 'licenses', newLicenseId), newLicense);
      await setDoc(doc(db, 'tenants', newTenantId), newTenantStore);
    } catch (e) {
      console.warn('Firestore write fallback info:', e);
    }

    return { success: true, license: newLicense, tenant: newTenantStore };
  };

  const toggleLicenseStatus = (licenseId: string, status: 'active' | 'suspended' | 'expired') => {
    setLicenses(prev => prev.map(l => l.id === licenseId ? { ...l, status } : l));
  };

  const updateLicense = async (licenseId: string, updates: Partial<SaaSLicense>) => {
    setLicenses(prev => prev.map(l => l.id === licenseId ? { ...l, ...updates } : l));
    try {
      await setDoc(doc(db, 'licenses', licenseId), updates, { merge: true });
    } catch (e) {
      console.warn('License update notice:', e);
    }
  };

  const createLicense = async (licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>): Promise<SaaSLicense> => {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setLicenses(prev => [newLicense, ...prev]);
    try {
      await setDoc(doc(db, 'licenses', newLicense.id), newLicense);
    } catch (e) {
      console.warn('License create notice:', e);
    }
    return newLicense;
  };

  const updatePlan = async (planId: string, updates: Partial<SaaSPlan>) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
  };

  // Marketplace items CRUD
  const addMarketplaceItem = async (itemData: Omit<MarketplaceItem, 'id' | 'createdAt'>): Promise<MarketplaceItem> => {
    const newItem: MarketplaceItem = {
      ...itemData,
      id: `mkt_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setMarketplaceItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateMarketplaceItem = async (id: string, updates: Partial<MarketplaceItem>) => {
    setMarketplaceItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteMarketplaceItem = async (id: string) => {
    setMarketplaceItems(prev => prev.filter(item => item.id !== id));
  };

  // Products CRUD
  const addProduct = async (productData: Omit<ProductItem, 'id' | 'createdAt'>): Promise<ProductItem> => {
    const newProduct: ProductItem = {
      ...productData,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    
    try {
      await setDoc(doc(db, 'products', newProduct.id), newProduct);
    } catch (e) {
      console.warn('Product save notice:', e);
    }
    return newProduct;
  };

  const updateProduct = async (productId: string, updates: Partial<ProductItem>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
    try {
      await setDoc(doc(db, 'products', productId), updates, { merge: true });
    } catch (e) {
      console.warn('Product update notice:', e);
    }
  };

  const deleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Orders
  const createOrder = async (orderData: Omit<StoreOrder, 'id' | 'orderNumber' | 'createdAt'>): Promise<StoreOrder> => {
    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: StoreOrder = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [newOrder, ...prev]);
    
    try {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    } catch (e) {
      console.warn('Order save notice:', e);
    }
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, updates: Partial<StoreOrder>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    try {
      await setDoc(doc(db, 'orders', orderId), updates, { merge: true });
    } catch (e) {
      console.warn('Order update notice:', e);
    }
  };

  // Plugins
  const togglePlugin = async (pluginId: string) => {
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  const updatePluginConfig = async (pluginId: string, config: Record<string, any>) => {
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, config: { ...p.config, ...config } } : p));
  };

  const installNewPlugin = async (plugin: PluginDefinition) => {
    setPlugins(prev => [...prev, plugin]);
  };

  // Themes
  const installNewTheme = async (theme: ThemeDefinition) => {
    setThemes(prev => [...prev, theme]);
    setActiveThemeId(theme.id);
  };

  // Batch import (Fenix All Import)
  const importProductsBatch = async (items: Partial<ProductItem>[]): Promise<{ importedCount: number }> => {
    const formatted: ProductItem[] = items.map((item, idx) => ({
      id: `prod_imp_${Date.now()}_${idx}`,
      tenantId: tenant.id,
      title: item.title || `Producto Importado #${idx + 1}`,
      slug: (item.title || `producto-${idx}`).toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: item.description || 'Descripción detallada de producto importado vía Fenix All Import Pro.',
      category: item.category || 'General',
      price: Number(item.price) || 29.99,
      compareAtPrice: item.compareAtPrice ? Number(item.compareAtPrice) : undefined,
      sku: item.sku || `SKU-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: Number(item.stock) || 50,
      rating: 4.8,
      reviewsCount: Math.floor(10 + Math.random() * 200),
      images: item.images && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80'],
      tags: ['importado', 'fenix-all-import'],
      status: 'active',
      createdAt: new Date().toISOString()
    }));

    setProducts(prev => [...formatted, ...prev]);
    return { importedCount: formatted.length };
  };

  const resetToDemoData = () => {
    setPlans(INITIAL_PLANS);
    setLicenses(INITIAL_LICENSES);
    setTenant(INITIAL_TENANT);
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setPlugins(INITIAL_PLUGINS);
    setThemes(INITIAL_THEMES);
    setActiveThemeIdState('theme_fenix_market');
    setCart([]);
  };

  return (
    <StoreContext.Provider value={{
      currentRoute,
      setCurrentRoute,
      currentLocale,
      setCurrentLocale,
      isAuthenticated,
      currentUser,
      loginBackend,
      logoutBackend,
      plans,
      licenses,
      tenant,
      products,
      orders,
      plugins,
      themes,
      activeTheme,
      marketplaceItems,
      cart,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      selectedProductForModal,
      setSelectedProductForModal,
      buyLicenseWithPayPal,
      toggleLicenseStatus,
      updateLicense,
      createLicense,
      updatePlan,
      addMarketplaceItem,
      updateMarketplaceItem,
      deleteMarketplaceItem,
      addProduct,
      updateProduct,
      deleteProduct,
      createOrder,
      updateOrderStatus,
      togglePlugin,
      updatePluginConfig,
      installNewPlugin,
      setActiveThemeId,
      installNewTheme,
      importProductsBatch,
      resetToDemoData,
      isDbConnected
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
