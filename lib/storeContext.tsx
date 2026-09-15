'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
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
  MarketplaceItem,
  ApplicationDefinition,
  BlogPost,
  ClassifiedAdItem,
  MediaItem,
  AuditLogItem,
  PlanEntitlements,
  TenantBranding
} from '@/types';
import { 
  INITIAL_PLANS, 
  INITIAL_LICENSES, 
  INITIAL_TENANT, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_PLUGINS, 
  INITIAL_THEMES,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_BLOG_POSTS,
  INITIAL_CLASSIFIED_ADS,
  INITIAL_MEDIA_ITEMS,
  INITIAL_APPLICATIONS
} from './initialData';
import { ApplicationService } from './services/application.service';
import { AuditService } from './services/audit.service';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function subscribeAuthStore(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('fenix_auth_update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('fenix_auth_update', callback);
  };
}

function getAuthSnapshot(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('fenix_backend_auth') || '';
  } catch {
    return '';
  }
}

function getAuthServerSnapshot(): string {
  return '';
}

interface StoreContextType {
  currentRoute: DomainRoute;
  setCurrentRoute: (route: DomainRoute) => void;
  currentLocale: SupportedLocale;
  setCurrentLocale: (locale: SupportedLocale) => void;
  
  // Auth state
  isAuthenticated: boolean;
  currentUser: { email: string; name: string; role: 'super_admin' | 'merchant_admin' | 'staff' | 'customer' } | null;
  loginBackend: (email: string, pass: string, tenantSlug?: string) => Promise<{ success: boolean; error?: string }>;
  logoutBackend: () => Promise<void>;
  
  // Applications & Plans Catalog (Fase 1 y 2)
  applications: ApplicationDefinition[];
  createApplication: (app: Omit<ApplicationDefinition, 'id' | 'createdAt'>) => Promise<ApplicationDefinition>;
  updateApplication: (id: string, updates: Partial<ApplicationDefinition>) => Promise<void>;
  toggleApplicationStatus: (id: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  
  plans: SaaSPlan[];
  updatePlan: (planId: string, updates: Partial<SaaSPlan>) => Promise<void>;
  createPlan: (planData: Omit<SaaSPlan, 'id'>) => Promise<SaaSPlan>;
  deletePlan: (planId: string) => Promise<void>;
  clearAllPlans: () => Promise<void>;
  resetDefaultPlans: () => Promise<void>;
  updatePlanEntitlements: (planId: string, entitlements: PlanEntitlements) => Promise<void>;
  
  // Licencias & Tenants
  licenses: SaaSLicense[];
  tenant: TenantStore;
  activeStoreHost: string;
  setActiveStoreHost: (host: string) => void;
  resolveStorefrontFromHost: (host: string) => Promise<boolean>;
  updateTenant: (updates: Partial<TenantStore>) => Promise<void>;
  updateTenantBranding: (branding: Partial<TenantBranding>) => Promise<void>;
  createLicense: (licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>) => Promise<SaaSLicense>;
  updateLicense: (licenseId: string, updates: Partial<SaaSLicense>) => Promise<void>;
  toggleLicenseStatus: (licenseId: string, status: 'active' | 'suspended' | 'expired') => void;
  
  // Módulos de Contenido (Ecommerce, Blog, Clasificados, Media)
  products: ProductItem[];
  orders: StoreOrder[];
  blogPosts: BlogPost[];
  classifiedAds: ClassifiedAdItem[];
  mediaItems: MediaItem[];
  auditLogs: AuditLogItem[];
  logAction: (action: string, entity: string, details?: Record<string, any>) => void;
  
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
  
  // Marketplace items CRUD
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => Promise<MarketplaceItem>;
  updateMarketplaceItem: (id: string, updates: Partial<MarketplaceItem>) => Promise<void>;
  deleteMarketplaceItem: (id: string) => Promise<void>;
  
  addProduct: (product: Omit<ProductItem, 'id' | 'createdAt'>) => Promise<ProductItem>;
  updateProduct: (productId: string, updates: Partial<ProductItem>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  
  // Blog CRUD
  addBlogPost: (post: Omit<BlogPost, 'id' | 'viewsCount' | 'publishedAt'>) => Promise<BlogPost>;
  updateBlogPost: (id: string, updates: Partial<BlogPost>) => Promise<void>;
  deleteBlogPost: (id: string) => Promise<void>;
  
  // Clasificados CRUD
  addClassifiedAd: (ad: Omit<ClassifiedAdItem, 'id' | 'viewsCount' | 'favoritesCount' | 'createdAt'>) => Promise<ClassifiedAdItem>;
  updateClassifiedAd: (id: string, updates: Partial<ClassifiedAdItem>) => Promise<void>;
  deleteClassifiedAd: (id: string) => Promise<void>;
  
  // Media CRUD
  addMediaItem: (file: { filename: string; url: string; mimeType: string; size: number; alt?: string }) => Promise<MediaItem>;
  deleteMediaItem: (id: string) => Promise<void>;
  
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

  // Backend Authentication State synced via useSyncExternalStore
  const authRaw = useSyncExternalStore(subscribeAuthStore, getAuthSnapshot, getAuthServerSnapshot);
  
  const currentUser = useMemo<{ email: string; name: string; role: 'super_admin' | 'merchant_admin' } | null>(() => {
    if (!authRaw) return null;
    try {
      const parsed = JSON.parse(authRaw);
      if (parsed && parsed.email) return parsed;
    } catch {}
    return null;
  }, [authRaw]);

  const isAuthenticated = Boolean(currentUser && currentUser.email);

  const [applications, setApplications] = useState<ApplicationDefinition[]>(INITIAL_APPLICATIONS);
  const [plans, setPlans] = useState<SaaSPlan[]>(INITIAL_PLANS);
  const [licenses, setLicenses] = useState<SaaSLicense[]>(INITIAL_LICENSES);
  const [tenant, setTenant] = useState<TenantStore>(INITIAL_TENANT);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<StoreOrder[]>(INITIAL_ORDERS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [classifiedAds, setClassifiedAds] = useState<ClassifiedAdItem[]>(INITIAL_CLASSIFIED_ADS);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(AuditService.getAll());
  
  const [plugins, setPlugins] = useState<PluginDefinition[]>(INITIAL_PLUGINS);
  const [themes, setThemes] = useState<ThemeDefinition[]>(INITIAL_THEMES);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
  const [activeThemeId, setActiveThemeIdState] = useState<string>('theme_fenix_market');
  const [activeStoreHost, setActiveStoreHost] = useState<string>('tienda-demo.es');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductItem | null>(null);
  const [isDbConnected] = useState<boolean>(true);

  // Dynamic Storefront Resolver from Backend / PostgreSQL
  const resolveStorefrontFromHost = useCallback(async (host: string): Promise<boolean> => {
    try {
      const cleanHost = host.trim().toLowerCase().split(':')[0];
      const res = await fetch(`/api/storefront/resolve?host=${encodeURIComponent(cleanHost)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tenant) {
          setTenant(data.tenant);
          setActiveStoreHost(cleanHost);
          if (Array.isArray(data.products)) {
            setProducts(data.products);
          }
          if (data.content?.blogPosts) {
            setBlogPosts(data.content.blogPosts);
          }
          if (data.content?.classifiedAds) {
            setClassifiedAds(data.content.classifiedAds);
          }
          if (data.theme?.id) {
            setActiveThemeIdState(data.theme.id);
          }
          if (data.language?.defaultLocale) {
            setCurrentLocale(data.language.defaultLocale);
          }
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('Error resolving storefront for host:', host, err);
      return false;
    }
  }, [setCurrentLocale]);

  // Sync initial setup with Firestore & PostgreSQL
  useEffect(() => {
    async function syncFromCloud() {
      try {
        const tenantRef = doc(db, 'tenants', 'tenant_demo');
        // Add a 3-second timeout guard to prevent Firestore connection stall
        const docPromise = getDoc(tenantRef);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const snap = await Promise.race([docPromise, timeoutPromise]);
        if (snap && snap.exists && snap.exists()) {
          setTenant(prev => ({ ...prev, ...(snap.data() as Partial<TenantStore>) }));
        }
      } catch (err) {
        console.warn('Firestore initial read notice:', err);
      }
    }
    async function syncApplications() {
      try {
        const res = await fetch('/api/admin/applications?public=true');
        if (res.ok) {
          const data = await res.json();
          if (data.applications && Array.isArray(data.applications) && data.applications.length > 0) {
            setApplications(data.applications);
          }
        }
      } catch (err) {
        console.warn('PostgreSQL applications read notice:', err);
      }
    }
    async function syncPlans() {
      try {
        const res = await fetch('/api/admin/plans');
        if (res.ok) {
          const data = await res.json();
          if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
            setPlans(data.plans);
          }
        }
      } catch (err) {
        console.warn('PostgreSQL plans read notice:', err);
      }
    }
    syncFromCloud();
    syncApplications();
    syncPlans();
  }, []);

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

  const setActiveThemeId = (id: string) => {
    setActiveThemeIdState(id);
    setTenant(prev => ({ ...prev, themeId: id }));
  };

  const logAction = useCallback((action: string, entity: string, details?: Record<string, any>) => {
    const entry = AuditService.log(action, entity, details, tenant?.id, currentUser?.email || 'info@fenixcms.es');
    setAuditLogs(prev => [entry, ...prev]);
  }, [tenant?.id, currentUser?.email]);

  const loginBackend = async (inputEmail: string, inputPass: string, tenantSlug?: string) => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const cleanPass = inputPass.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          tenantSlug: tenantSlug || tenant?.slug
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const role = data.user.role === 'SUPER_ADMIN' ? 'super_admin' : 'merchant_admin';
        const userObj = {
          email: data.user.email,
          name: data.user.name,
          role
        };
        try {
          localStorage.setItem('fenix_backend_auth', JSON.stringify(userObj));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('fenix_auth_update'));
          }
        } catch {}

        logAction('USER_LOGIN', 'Auth', { email: cleanEmail, role });
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Credenciales de acceso no válidas'
      };
    } catch (err: any) {
      console.warn('Login request error, using secure validation fallback:', err);
      return {
        success: false,
        error: 'No se pudo verificar la sesión con el servidor de autenticación'
      };
    }
  };

  const logoutBackend = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('fenix_backend_auth');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('fenix_auth_update'));
      }
    } catch {}
    logAction('USER_LOGOUT', 'Auth');
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

  // Applications CRUD
  const createApplication = async (appData: Omit<ApplicationDefinition, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.application;
        setApplications(prev => [...prev.filter(a => a.id !== created.id), created]);
        logAction('APPLICATION_CREATED', 'Application', { key: created.key, name: created.name });
        return created;
      }
    } catch {}
    const newApp = await ApplicationService.create(appData);
    setApplications(prev => [...prev, newApp]);
    logAction('APPLICATION_CREATED', 'Application', { key: newApp.key, name: newApp.name });
    return newApp;
  };

  const updateApplication = async (id: string, updates: Partial<ApplicationDefinition>) => {
    try {
      await fetch(`/api/admin/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch {}
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    logAction('APPLICATION_UPDATED', 'Application', { id, updates });
  };

  const toggleApplicationStatus = async (id: string) => {
    const current = applications.find(a => a.id === id);
    const nextStatus = current?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch {}
    setApplications(prev => prev.map(a => {
      if (a.id === id) {
        logAction('APPLICATION_STATUS_TOGGLED', 'Application', { id, status: nextStatus });
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const deleteApplication = async (id: string) => {
    try {
      await fetch(`/api/admin/applications/${id}`, {
        method: 'DELETE'
      });
    } catch {}
    setApplications(prev => prev.filter(a => a.id !== id));
    logAction('APPLICATION_DELETED', 'Application', { id });
  };

  // Plans & Entitlements CRUD
  const updatePlan = async (planId: string, updates: Partial<SaaSPlan>) => {
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
    logAction('PLAN_UPDATED', 'Plan', { planId, updates });
  };

  const createPlan = async (planData: Omit<SaaSPlan, 'id'>) => {
    const newPlan: SaaSPlan = {
      ...planData,
      id: `plan_${Date.now()}`
    };
    setPlans(prev => [...prev, newPlan]);
    logAction('PLAN_CREATED', 'Plan', { name: newPlan.name, price: newPlan.priceMonthly });
    return newPlan;
  };

  const deletePlan = async (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId));
    logAction('PLAN_DELETED', 'Plan', { planId });
  };

  const clearAllPlans = async () => {
    setPlans([]);
    logAction('ALL_PLANS_CLEARED', 'Plan', { count: plans.length });
  };

  const resetDefaultPlans = async () => {
    setPlans(INITIAL_PLANS);
    logAction('PLANS_RESET_DEFAULT', 'Plan', { count: INITIAL_PLANS.length });
  };

  const updatePlanEntitlements = async (planId: string, entitlements: PlanEntitlements) => {
    setPlans(prev => prev.map(p => {
      if (p.id === planId) {
        return { ...p, entitlements: { ...p.entitlements, ...entitlements } };
      }
      return p;
    }));
    logAction('PLAN_ENTITLEMENTS_UPDATED', 'Plan', { planId, entitlements });
  };

  // Licenses CRUD
  const buyLicenseWithPayPal = async (
    planId: string, 
    customerName: string, 
    customerEmail: string, 
    billingPeriod: 'monthly' | 'yearly', 
    storeName: string, 
    storeSlug: string
  ) => {
    const selectedPlan = plans.find(p => p.id === planId) || plans[1];
    const generatedLicenseKey = `FNX-${selectedPlan.slug.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}-${storeSlug.toUpperCase().slice(0, 6)}`;
    const newLicenseId = `lic_${Date.now()}`;
    const newTenantId = `tenant_${storeSlug.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const newLicense: SaaSLicense = {
      id: newLicenseId,
      tenantId: newTenantId,
      applicationId: selectedPlan.applicationId || 'app_ecommerce',
      licenseKey: generatedLicenseKey,
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      status: 'active',
      customerName,
      customerEmail,
      tenantSlug: storeSlug,
      tenantName: storeName,
      price: Number((billingPeriod === 'yearly' ? ((selectedPlan as any).yearlyPrice ?? selectedPlan.priceYearly) : ((selectedPlan as any).monthlyPrice ?? selectedPlan.priceMonthly)) || 0),
      billingPeriod,
      paymentProvider: 'paypal',
      transactionId: `PP-TX-${Date.now()}`,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
      entitlements: selectedPlan.entitlements,
      createdAt: new Date().toISOString()
    };

    const newTenant: TenantStore = {
      id: newTenantId,
      name: storeName,
      slug: storeSlug,
      domain: `${storeSlug}.fenixcms.es`,
      status: 'active',
      applicationId: selectedPlan.applicationId || 'app_ecommerce',
      enabledApplications: ['ECOMMERCE', 'BLOG'],
      planId: selectedPlan.id,
      licenseKey: generatedLicenseKey,
      ownerEmail: customerEmail,
      ownerName: customerName,
      themeId: 'theme_fenix_market',
      currency: 'EUR',
      defaultLocale: 'es',
      supportedLocales: ['es', 'en', 'it', 'fr', 'de', 'pt'],
      branding: {
        primaryColor: '#f59e0b',
        accentColor: '#10b981',
        fontFamily: 'Inter, sans-serif'
      },
      settings: {
        storeName,
        tagline: 'Tienda Oficial creada con FenixCMS',
        supportEmail: customerEmail,
        phone: '+34 900 000 000',
        address: 'Calle Principal 10, Madrid',
        taxRate: 21,
        shippingBaseCost: 3.99,
        freeShippingThreshold: 50.00
      },
      activePlugins: ['plugin_paypal', 'plugin_stripe', 'plugin_correos', 'plugin_fenix_import'],
      createdAt: new Date().toISOString()
    };

    setLicenses(prev => [newLicense, ...prev]);
    setTenant(newTenant);
    logAction('LICENSE_PURCHASED', 'License', { key: generatedLicenseKey, store: storeName, customer: customerEmail });

    return { success: true, license: newLicense, tenant: newTenant };
  };

  const toggleLicenseStatus = (licenseId: string, status: 'active' | 'suspended' | 'expired') => {
    setLicenses(prev => prev.map(l => l.id === licenseId ? { ...l, status } : l));
    logAction('LICENSE_STATUS_TOGGLED', 'License', { licenseId, status });
  };

  const updateLicense = async (licenseId: string, updates: Partial<SaaSLicense>) => {
    setLicenses(prev => prev.map(l => l.id === licenseId ? { ...l, ...updates } : l));
    logAction('LICENSE_UPDATED', 'License', { licenseId, updates });
  };

  const createLicense = async (licenseData: Omit<SaaSLicense, 'id' | 'createdAt'>) => {
    const newLicense: SaaSLicense = {
      ...licenseData,
      id: `lic_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setLicenses(prev => [newLicense, ...prev]);
    logAction('LICENSE_CREATED_MANUAL', 'License', { key: newLicense.licenseKey, customer: newLicense.customerEmail });
    return newLicense;
  };

  const updateTenant = async (updates: Partial<TenantStore>) => {
    setTenant(prev => ({ ...prev, ...updates }));
    logAction('TENANT_SETTINGS_UPDATED', 'Tenant', updates);
  };

  const updateTenantBranding = async (branding: Partial<TenantBranding>) => {
    setTenant(prev => ({
      ...prev,
      branding: { ...prev.branding, ...branding }
    }));
    logAction('TENANT_BRANDING_UPDATED', 'Tenant', branding);
  };

  // Products CRUD
  const addProduct = async (productData: Omit<ProductItem, 'id' | 'createdAt'>) => {
    const newProduct: ProductItem = {
      ...productData,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    logAction('PRODUCT_CREATED', 'Product', { title: newProduct.title, sku: newProduct.sku });
    return newProduct;
  };

  const updateProduct = async (productId: string, updates: Partial<ProductItem>) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
    logAction('PRODUCT_UPDATED', 'Product', { productId, updates });
  };

  const deleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    logAction('PRODUCT_DELETED', 'Product', { productId });
  };

  // Blog CRUD
  const addBlogPost = async (postData: Omit<BlogPost, 'id' | 'viewsCount' | 'publishedAt'>) => {
    const newPost: BlogPost = {
      ...postData,
      id: `post_${Date.now()}`,
      viewsCount: 0,
      publishedAt: new Date().toISOString()
    };
    setBlogPosts(prev => [newPost, ...prev]);
    logAction('BLOG_POST_CREATED', 'BlogPost', { title: newPost.title, slug: newPost.slug });
    return newPost;
  };

  const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
    setBlogPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    logAction('BLOG_POST_UPDATED', 'BlogPost', { id, updates });
  };

  const deleteBlogPost = async (id: string) => {
    setBlogPosts(prev => prev.filter(p => p.id !== id));
    logAction('BLOG_POST_DELETED', 'BlogPost', { id });
  };

  // Classified Ads CRUD via REST API
  const addClassifiedAd = async (adData: Omit<ClassifiedAdItem, 'id' | 'viewsCount' | 'favoritesCount' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/classifieds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ad) {
          setClassifiedAds(prev => [data.ad, ...prev]);
          logAction('CLASSIFIED_AD_CREATED', 'ClassifiedAd', { title: data.ad.title, price: data.ad.price });
          return data.ad;
        }
      }
    } catch (err) {
      console.error('Error creating classified ad:', err);
    }
    const newAd: ClassifiedAdItem = {
      ...adData,
      id: `ad_${Date.now()}`,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setClassifiedAds(prev => [newAd, ...prev]);
    return newAd;
  };

  const updateClassifiedAd = async (id: string, updates: Partial<ClassifiedAdItem>) => {
    try {
      const res = await fetch('/api/classifieds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ad) {
          setClassifiedAds(prev => prev.map(a => a.id === id ? data.ad : a));
          logAction('CLASSIFIED_AD_UPDATED', 'ClassifiedAd', { id, updates });
          return;
        }
      }
    } catch (err) {
      console.error('Error updating classified ad:', err);
    }
    setClassifiedAds(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteClassifiedAd = async (id: string) => {
    try {
      const res = await fetch(`/api/classifieds?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setClassifiedAds(prev => prev.filter(a => a.id !== id));
        logAction('CLASSIFIED_AD_DELETED', 'ClassifiedAd', { id });
        return;
      }
    } catch (err) {
      console.error('Error deleting classified ad:', err);
    }
    setClassifiedAds(prev => prev.filter(a => a.id !== id));
  };

  // Media Library CRUD
  const addMediaItem = async (file: { filename: string; url: string; mimeType: string; size: number; alt?: string }) => {
    const newMedia: MediaItem = {
      id: `med_${Date.now()}`,
      tenantId: tenant?.id || 'tenant_demo',
      filename: file.filename,
      url: file.url,
      mimeType: file.mimeType,
      size: file.size,
      alt: file.alt || file.filename,
      createdAt: new Date().toISOString()
    };
    setMediaItems(prev => [newMedia, ...prev]);
    logAction('MEDIA_UPLOADED', 'Media', { filename: file.filename, size: file.size });
    return newMedia;
  };

  const deleteMediaItem = async (id: string) => {
    setMediaItems(prev => prev.filter(m => m.id !== id));
    logAction('MEDIA_DELETED', 'Media', { id });
  };

  // Orders CRUD
  const createOrder = async (orderData: Omit<StoreOrder, 'id' | 'orderNumber' | 'createdAt'>) => {
    const orderNum = `FNX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: StoreOrder = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [newOrder, ...prev]);
    logAction('ORDER_PLACED', 'Order', { orderNumber: orderNum, total: newOrder.total });
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, updates: Partial<StoreOrder>) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    logAction('ORDER_STATUS_UPDATED', 'Order', { orderId, updates });
  };

  // Plugins & Themes
  const togglePlugin = async (pluginId: string) => {
    setPlugins(prev => prev.map(p => {
      if (p.id === pluginId) {
        const nextEnabled = !p.enabled;
        logAction('PLUGIN_TOGGLED', 'Plugin', { pluginId, enabled: nextEnabled });
        return { ...p, enabled: nextEnabled };
      }
      return p;
    }));
  };

  const updatePluginConfig = async (pluginId: string, config: Record<string, any>) => {
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, config: { ...p.config, ...config } } : p));
    logAction('PLUGIN_CONFIG_UPDATED', 'Plugin', { pluginId });
  };

  const installNewPlugin = async (plugin: PluginDefinition) => {
    setPlugins(prev => [...prev, plugin]);
    logAction('PLUGIN_INSTALLED', 'Plugin', { name: plugin.name });
  };

  const installNewTheme = async (theme: ThemeDefinition) => {
    setThemes(prev => [...prev, theme]);
    logAction('THEME_INSTALLED', 'Theme', { name: theme.name });
  };

  const addMarketplaceItem = async (item: Omit<MarketplaceItem, 'id'>) => {
    const newItem: MarketplaceItem = {
      ...item,
      id: `mkt_${Date.now()}`
    };
    setMarketplaceItems(prev => [newItem, ...prev]);
    logAction('MARKETPLACE_ITEM_PUBLISHED', 'Marketplace', { name: newItem.name, type: newItem.type });
    return newItem;
  };

  const updateMarketplaceItem = async (id: string, updates: Partial<MarketplaceItem>) => {
    setMarketplaceItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteMarketplaceItem = async (id: string) => {
    setMarketplaceItems(prev => prev.filter(i => i.id !== id));
  };

  const importProductsBatch = async (newProducts: Partial<ProductItem>[]) => {
    const formatted: ProductItem[] = newProducts.map((p, idx) => ({
      id: `imp_${Date.now()}_${idx}`,
      tenantId: tenant?.id || 'tenant_demo',
      title: p.title || 'Producto Importado',
      slug: (p.title || 'producto-importado').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: p.description || '',
      category: p.category || 'General',
      price: Number(p.price) || 19.99,
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
      sku: p.sku || `SKU-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: Number(p.stock) || 10,
      rating: 5,
      reviewsCount: 0,
      images: p.images && p.images.length ? p.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
      tags: p.tags || ['importado'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }));

    setProducts(prev => [...formatted, ...prev]);
    logAction('PRODUCTS_IMPORTED_BATCH', 'Product', { count: formatted.length });
    return { importedCount: formatted.length };
  };

  const resetToDemoData = () => {
    setApplications(INITIAL_APPLICATIONS);
    setPlans(INITIAL_PLANS);
    setLicenses(INITIAL_LICENSES);
    setTenant(INITIAL_TENANT);
    setProducts(INITIAL_PRODUCTS);
    setOrders(INITIAL_ORDERS);
    setBlogPosts(INITIAL_BLOG_POSTS);
    setClassifiedAds(INITIAL_CLASSIFIED_ADS);
    setMediaItems(INITIAL_MEDIA_ITEMS);
    setPlugins(INITIAL_PLUGINS);
    setThemes(INITIAL_THEMES);
    setActiveThemeIdState('theme_fenix_market');
    setCart([]);
    logAction('SYSTEM_RESET_DEMO', 'System');
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
      applications,
      createApplication,
      updateApplication,
      toggleApplicationStatus,
      deleteApplication,
      plans,
      createPlan,
      updatePlan,
      deletePlan,
      clearAllPlans,
      resetDefaultPlans,
      updatePlanEntitlements,
      licenses,
      tenant,
      activeStoreHost,
      setActiveStoreHost,
      resolveStorefrontFromHost,
      updateTenant,
      updateTenantBranding,
      products,
      orders,
      blogPosts,
      classifiedAds,
      mediaItems,
      auditLogs,
      logAction,
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
      addMarketplaceItem,
      updateMarketplaceItem,
      deleteMarketplaceItem,
      addProduct,
      updateProduct,
      deleteProduct,
      addBlogPost,
      updateBlogPost,
      deleteBlogPost,
      addClassifiedAd,
      updateClassifiedAd,
      deleteClassifiedAd,
      addMediaItem,
      deleteMediaItem,
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
