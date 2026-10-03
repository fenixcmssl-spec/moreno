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
import { AuditService } from './services/audit.service';
import { apiClient, ApiError } from './api/client';

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
  
  // Auth state - Server-Authoritative via /api/auth/session & Cookie
  isAuthenticated: boolean;
  currentUser: { email: string; name: string; role: 'super_admin' | 'merchant_admin' | 'staff' | 'customer' } | null;
  loginBackend: (email: string, pass: string, tenantSlug?: string) => Promise<{ success: boolean; error?: string }>;
  logoutBackend: () => Promise<void>;
  
  // Applications & Plans Catalog
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

export interface StoreProviderProps {
  children: React.ReactNode;
  initialRoute?: DomainRoute;
  initialTenant?: TenantStore;
  initialProducts?: ProductItem[];
  initialBlogPosts?: BlogPost[];
  initialClassifiedAds?: ClassifiedAdItem[];
  initialLocale?: SupportedLocale;
  initialActiveThemeId?: string;
}

export function StoreProvider({
  children,
  initialRoute = 'saas_landing',
  initialTenant = INITIAL_TENANT,
  initialProducts = INITIAL_PRODUCTS,
  initialBlogPosts = INITIAL_BLOG_POSTS,
  initialClassifiedAds = INITIAL_CLASSIFIED_ADS,
  initialLocale = 'es',
  initialActiveThemeId = 'theme_fenix_market',
}: StoreProviderProps) {
  const [currentRoute, setCurrentRoute] = useState<DomainRoute>(initialRoute);
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(initialLocale);

  // Backend Authentication State
  const authRaw = useSyncExternalStore(subscribeAuthStore, getAuthSnapshot, getAuthServerSnapshot);
  
  const [serverUser, setServerUser] = useState<{ email: string; name: string; role: 'super_admin' | 'merchant_admin' | 'staff' | 'customer' } | null>(null);

  const currentUser = useMemo<{ email: string; name: string; role: 'super_admin' | 'merchant_admin' | 'staff' | 'customer' } | null>(() => {
    if (serverUser) return serverUser;
    if (!authRaw) return null;
    try {
      const parsed = JSON.parse(authRaw);
      if (parsed && parsed.email) return parsed;
    } catch {}
    return null;
  }, [serverUser, authRaw]);

  const isAuthenticated = Boolean(currentUser && currentUser.email);

  const isProd = process.env.NODE_ENV === 'production';

  const [applications, setApplications] = useState<ApplicationDefinition[]>(isProd ? [] : INITIAL_APPLICATIONS);
  const [plans, setPlans] = useState<SaaSPlan[]>(isProd ? [] : INITIAL_PLANS);
  const [licenses, setLicenses] = useState<SaaSLicense[]>(isProd ? [] : INITIAL_LICENSES);
  const [tenant, setTenant] = useState<TenantStore>(isProd ? initialTenant : initialTenant);
  const [products, setProducts] = useState<ProductItem[]>(isProd ? [] : initialProducts);
  const [orders, setOrders] = useState<StoreOrder[]>(isProd ? [] : INITIAL_ORDERS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(isProd ? [] : initialBlogPosts);
  const [classifiedAds, setClassifiedAds] = useState<ClassifiedAdItem[]>(isProd ? [] : initialClassifiedAds);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(isProd ? [] : INITIAL_MEDIA_ITEMS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(AuditService.getAll());
  
  const [plugins, setPlugins] = useState<PluginDefinition[]>(isProd ? [] : INITIAL_PLUGINS);
  const [themes, setThemes] = useState<ThemeDefinition[]>(isProd ? [] : INITIAL_THEMES);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(isProd ? [] : INITIAL_MARKETPLACE_ITEMS);
  const [activeThemeId, setActiveThemeIdState] = useState<string>(initialActiveThemeId);
  const [activeStoreHost, setActiveStoreHost] = useState<string>(initialTenant.domain || `${initialTenant.slug}.es`);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductItem | null>(null);
  const [isDbConnected] = useState<boolean>(true);

  // Initial Session & Catalog Sync from Server (PostgreSQL)
  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      try {
        const sessionData = await apiClient.get('/api/auth/session');
        if (isMounted && sessionData?.user) {
          const role = sessionData.user.role === 'SUPER_ADMIN' ? 'super_admin' : 'merchant_admin';
          const u = {
            email: sessionData.user.email,
            name: sessionData.user.name || sessionData.user.email,
            role
          };
          setServerUser(u as any);
        }
      } catch {
        // Unauthenticated or service unavailable
      }
    }

    async function syncApplications() {
      try {
        const data = await apiClient.get('/api/admin/applications?public=true');
        if (isMounted && data?.applications && Array.isArray(data.applications) && data.applications.length > 0) {
          setApplications(data.applications);
        }
      } catch (err) {
        console.warn('PostgreSQL applications load notice:', err);
      }
    }

    async function syncPlans() {
      try {
        const data = await apiClient.get('/api/admin/plans');
        if (isMounted && data?.plans && Array.isArray(data.plans) && data.plans.length > 0) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.warn('PostgreSQL plans load notice:', err);
      }
    }

    syncSession();
    syncApplications();
    syncPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Storefront Resolver from Backend / PostgreSQL
  const resolveStorefrontFromHost = useCallback(async (host: string): Promise<boolean> => {
    try {
      const cleanHost = host.trim().toLowerCase().split(':')[0];
      const data = await apiClient.get(`/api/storefront/resolve?host=${encodeURIComponent(cleanHost)}`);
      if (data && data.success && data.tenant) {
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
      return false;
    } catch (err) {
      console.warn('Error resolving storefront for host:', host, err);
      return false;
    }
  }, [setCurrentLocale]);

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
      const data = await apiClient.post('/api/auth/login', {
        email: cleanEmail,
        password: cleanPass,
        tenantSlug: tenantSlug || tenant?.slug
      });

      if (data && data.success && data.user) {
        const role = data.user.role === 'SUPER_ADMIN' ? 'super_admin' : 'merchant_admin';
        const userObj = {
          email: data.user.email,
          name: data.user.name,
          role
        };
        setServerUser(userObj as any);
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
        error: data?.error || 'Credenciales de acceso no válidas'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'No se pudo verificar la sesión con el servidor de autenticación'
      };
    }
  };

  const logoutBackend = async () => {
    try {
      await apiClient.post('/api/auth/logout').catch(() => {});
      setServerUser(null);
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

  // Applications CRUD - Server-Authoritative
  const createApplication = async (appData: Omit<ApplicationDefinition, 'id' | 'createdAt'>) => {
    const data = await apiClient.post('/api/admin/applications', appData);
    if (!data || !data.application) {
      throw new Error(data?.error || 'Error creando aplicación en el servidor');
    }
    const created = data.application;
    setApplications(prev => [...prev.filter(a => a.id !== created.id), created]);
    logAction('APPLICATION_CREATED', 'Application', { key: created.key, name: created.name });
    return created;
  };

  const updateApplication = async (id: string, updates: Partial<ApplicationDefinition>) => {
    await apiClient.put(`/api/admin/applications/${id}`, updates);
    setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    logAction('APPLICATION_UPDATED', 'Application', { id, updates });
  };

  const toggleApplicationStatus = async (id: string) => {
    const current = applications.find(a => a.id === id);
    const nextStatus = current?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await apiClient.patch(`/api/admin/applications/${id}`, { status: nextStatus });
    setApplications(prev => prev.map(a => {
      if (a.id === id) {
        logAction('APPLICATION_STATUS_TOGGLED', 'Application', { id, status: nextStatus });
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const deleteApplication = async (id: string) => {
    await apiClient.delete(`/api/admin/applications/${id}`);
    setApplications(prev => prev.filter(a => a.id !== id));
    logAction('APPLICATION_DELETED', 'Application', { id });
  };

  // Plans & Entitlements CRUD - Server-Authoritative
  const updatePlan = async (planId: string, updates: Partial<SaaSPlan>) => {
    await apiClient.put(`/api/admin/plans/${planId}`, updates).catch(() => {});
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates } : p));
    logAction('PLAN_UPDATED', 'Plan', { planId, updates });
  };

  const createPlan = async (planData: Omit<SaaSPlan, 'id'>) => {
    const data = await apiClient.post('/api/admin/plans', planData);
    if (!data || !data.plan) {
      throw new Error(data?.error || 'Error creando plan en el servidor');
    }
    const newPlan = data.plan;
    setPlans(prev => [...prev, newPlan]);
    logAction('PLAN_CREATED', 'Plan', { name: newPlan.name, price: newPlan.priceMonthly });
    return newPlan;
  };

  const deletePlan = async (planId: string) => {
    await apiClient.delete(`/api/admin/plans/${planId}`).catch(() => {});
    setPlans(prev => prev.filter(p => p.id !== planId));
    logAction('PLAN_DELETED', 'Plan', { planId });
  };

  const clearAllPlans = async () => {
    setPlans([]);
    logAction('ALL_PLANS_CLEARED', 'Plan', { count: plans.length });
  };

  const resetDefaultPlans = async () => {
    try {
      const data = await apiClient.get('/api/admin/plans');
      if (data?.plans) {
        setPlans(data.plans);
        return;
      }
    } catch {}
    if (process.env.NODE_ENV !== 'production') {
      setPlans(INITIAL_PLANS);
    }
  };

  const updatePlanEntitlements = async (planId: string, entitlements: PlanEntitlements) => {
    await apiClient.patch(`/api/admin/plans/${planId}`, { entitlements }).catch(() => {});
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
    try {
      // 1. Iniciar checkout en servidor
      const checkoutData = await apiClient.post('/api/billing/checkout', {
        planId,
        customerName,
        customerEmail,
        billingPeriod,
        provider: 'PAYPAL',
        tenantName: storeName,
        tenantSlug: storeSlug
      });

      if (!checkoutData || !checkoutData.success) {
        throw new Error(checkoutData?.error || 'Error al iniciar checkout');
      }

      // 2. Capturar orden y aprovisionar en servidor
      const captureData = await apiClient.post('/api/billing/capture', {
        provider: 'PAYPAL',
        orderId: checkoutData.session.paymentId || checkoutData.session.sessionId,
        paymentId: checkoutData.session.paymentId
      });

      if (!captureData || !captureData.success) {
        throw new Error(captureData?.error || 'Error en captura de PayPal');
      }

      const newLicense = captureData.license;
      const newTenant = captureData.tenant;

      if (newLicense) setLicenses(prev => [newLicense, ...prev]);
      if (newTenant) setTenant(newTenant);
      logAction('LICENSE_PURCHASED', 'License', { key: newLicense?.licenseKey, store: storeName, customer: customerEmail });

      return { success: true, license: newLicense, tenant: newTenant };
    } catch (err: any) {
      console.error('buyLicenseWithPayPal server error:', err);
      throw err;
    }
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
    const data = await apiClient.post('/api/admin/licenses', licenseData).catch(() => null);
    if (data?.license) {
      setLicenses(prev => [data.license, ...prev]);
      return data.license;
    }
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
    if (tenant?.id) {
      await apiClient.patch(`/api/admin/tenants?id=${encodeURIComponent(tenant.id)}`, updates).catch(() => {});
    }
    setTenant(prev => ({ ...prev, ...updates }));
    logAction('TENANT_SETTINGS_UPDATED', 'Tenant', updates);
  };

  const updateTenantBranding = async (branding: Partial<TenantBranding>) => {
    if (tenant?.id) {
      await apiClient.patch(`/api/admin/tenants?id=${encodeURIComponent(tenant.id)}`, { branding }).catch(() => {});
    }
    setTenant(prev => ({
      ...prev,
      branding: { ...prev.branding, ...branding }
    }));
    logAction('TENANT_BRANDING_UPDATED', 'Tenant', branding);
  };

  // Products CRUD - Server-Authoritative
  const addProduct = async (productData: Omit<ProductItem, 'id' | 'createdAt'>) => {
    const data = await apiClient.post('/api/products', {
      ...productData,
      tenantId: tenant?.id
    });
    if (!data || !data.product) {
      throw new Error(data?.error || 'Error al guardar el producto en el servidor');
    }
    const newProduct = data.product;
    setProducts(prev => [newProduct, ...prev]);
    logAction('PRODUCT_CREATED', 'Product', { title: newProduct.title, sku: newProduct.sku });
    return newProduct;
  };

  const updateProduct = async (productId: string, updates: Partial<ProductItem>) => {
    const data = await apiClient.put('/api/products', {
      id: productId,
      ...updates,
      tenantId: tenant?.id
    });
    const updated = data?.product || { id: productId, ...updates };
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updated } : p));
    logAction('PRODUCT_UPDATED', 'Product', { productId, updates });
  };

  const deleteProduct = async (productId: string) => {
    await apiClient.delete(`/api/products?id=${encodeURIComponent(productId)}`);
    setProducts(prev => prev.filter(p => p.id !== productId));
    logAction('PRODUCT_DELETED', 'Product', { productId });
  };

  // Blog CRUD - Server-Authoritative
  const addBlogPost = async (postData: Omit<BlogPost, 'id' | 'viewsCount' | 'publishedAt'>) => {
    const data = await apiClient.post('/api/blog', {
      ...postData,
      tenantId: tenant?.id
    }).catch(() => null);

    const post = data?.post || {
      ...postData,
      id: `post_${Date.now()}`,
      viewsCount: 0,
      publishedAt: new Date().toISOString()
    };
    setBlogPosts(prev => [post, ...prev]);
    logAction('BLOG_POST_CREATED', 'BlogPost', { title: post.title, slug: post.slug });
    return post;
  };

  const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
    await apiClient.put('/api/blog', { id, ...updates, tenantId: tenant?.id }).catch(() => {});
    setBlogPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    logAction('BLOG_POST_UPDATED', 'BlogPost', { id, updates });
  };

  const deleteBlogPost = async (id: string) => {
    await apiClient.delete(`/api/blog?id=${encodeURIComponent(id)}`).catch(() => {});
    setBlogPosts(prev => prev.filter(p => p.id !== id));
    logAction('BLOG_POST_DELETED', 'BlogPost', { id });
  };

  // Classified Ads CRUD via REST API
  const addClassifiedAd = async (adData: Omit<ClassifiedAdItem, 'id' | 'viewsCount' | 'favoritesCount' | 'createdAt'>) => {
    const data = await apiClient.post('/api/classifieds', {
      ...adData,
      tenantId: tenant?.id
    });
    if (!data || !data.ad) {
      throw new Error(data?.error || 'Error al crear anuncio clasificado');
    }
    const createdAd = data.ad;
    setClassifiedAds(prev => [createdAd, ...prev]);
    logAction('CLASSIFIED_AD_CREATED', 'ClassifiedAd', { title: createdAd.title, price: createdAd.price });
    return createdAd;
  };

  const updateClassifiedAd = async (id: string, updates: Partial<ClassifiedAdItem>) => {
    const data = await apiClient.put('/api/classifieds', { id, ...updates });
    const updated = data?.ad || updates;
    setClassifiedAds(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
    logAction('CLASSIFIED_AD_UPDATED', 'ClassifiedAd', { id, updates });
  };

  const deleteClassifiedAd = async (id: string) => {
    await apiClient.delete(`/api/classifieds?id=${encodeURIComponent(id)}`);
    setClassifiedAds(prev => prev.filter(a => a.id !== id));
    logAction('CLASSIFIED_AD_DELETED', 'ClassifiedAd', { id });
  };

  // Media Library CRUD - Server-Authoritative
  const addMediaItem = async (file: { filename: string; url: string; mimeType: string; size: number; alt?: string }) => {
    const data = await apiClient.post('/api/media', {
      filename: file.filename,
      url: file.url,
      mimeType: file.mimeType,
      size: file.size,
      alt: file.alt || file.filename,
      tenantId: tenant?.id
    });

    if (!data || !data.asset) {
      throw new Error(data?.error || 'Error registrando archivo en el servidor');
    }

    const createdMedia: MediaItem = {
      id: data.asset.id,
      tenantId: data.asset.tenantId || tenant?.id || '',
      filename: data.asset.filename || file.filename,
      url: data.asset.url || file.url,
      mimeType: data.asset.mimeType || file.mimeType,
      size: data.asset.size || file.size,
      alt: data.asset.alt || file.alt || file.filename,
      createdAt: data.asset.createdAt || new Date().toISOString()
    };
    setMediaItems(prev => [createdMedia, ...prev]);
    logAction('MEDIA_UPLOADED', 'Media', { filename: createdMedia.filename, size: createdMedia.size });
    return createdMedia;
  };

  const deleteMediaItem = async (id: string) => {
    await apiClient.delete(`/api/media?id=${encodeURIComponent(id)}`);
    setMediaItems(prev => prev.filter(m => m.id !== id));
    logAction('MEDIA_DELETED', 'Media', { id });
  };

  // Orders CRUD - Server-Authoritative
  const createOrder = async (orderData: Omit<StoreOrder, 'id' | 'orderNumber' | 'createdAt'>) => {
    const data = await apiClient.post('/api/orders', {
      ...orderData,
      tenantId: tenant?.id
    });
    if (!data || !data.order) {
      throw new Error(data?.error || 'Error procesando el pedido en el servidor');
    }
    const newOrder = data.order;
    setOrders(prev => [newOrder, ...prev]);
    logAction('ORDER_PLACED', 'Order', { orderNumber: newOrder.orderNumber, total: newOrder.total });
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, updates: Partial<StoreOrder>) => {
    await apiClient.patch(`/api/orders?id=${encodeURIComponent(orderId)}`, updates).catch(() => {});
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    logAction('ORDER_STATUS_UPDATED', 'Order', { orderId, updates });
  };

  // Plugins & Themes
  const togglePlugin = async (pluginId: string) => {
    const current = plugins.find(p => p.id === pluginId);
    const nextEnabled = !current?.enabled;
    await apiClient.post('/api/plugins', { pluginId, enabled: nextEnabled, tenantId: tenant?.id }).catch(() => {});
    setPlugins(prev => prev.map(p => {
      if (p.id === pluginId) {
        logAction('PLUGIN_TOGGLED', 'Plugin', { pluginId, enabled: nextEnabled });
        return { ...p, enabled: nextEnabled };
      }
      return p;
    }));
  };

  const updatePluginConfig = async (pluginId: string, config: Record<string, any>) => {
    await apiClient.put('/api/plugins', { pluginId, config, tenantId: tenant?.id }).catch(() => {});
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, config: { ...p.config, ...config } } : p));
    logAction('PLUGIN_CONFIG_UPDATED', 'Plugin', { pluginId });
  };

  const installNewPlugin = async (plugin: PluginDefinition) => {
    await apiClient.post('/api/plugins', { ...plugin, tenantId: tenant?.id }).catch(() => {});
    setPlugins(prev => [...prev, plugin]);
    logAction('PLUGIN_INSTALLED', 'Plugin', { name: plugin.name });
  };

  const installNewTheme = async (theme: ThemeDefinition) => {
    await apiClient.post('/api/themes', { ...theme, tenantId: tenant?.id }).catch(() => {});
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
    const created: ProductItem[] = [];
    for (const p of newProducts) {
      try {
        const res = await apiClient.post('/api/products', {
          title: p.title || 'Producto Importado',
          slug: (p.title || 'producto-importado').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: p.description || '',
          category: p.category || 'General',
          price: Number(p.price) || 19.99,
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
          sku: p.sku || `SKU-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
          stock: Number(p.stock) || 10,
          images: p.images && p.images.length ? p.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
          tags: p.tags || ['importado'],
          status: 'ACTIVE',
          tenantId: tenant?.id
        });
        if (res?.product) {
          created.push(res.product);
        }
      } catch (err) {
        console.warn('Batch item import server notice:', err);
      }
    }

    if (created.length > 0) {
      setProducts(prev => [...created, ...prev]);
    }
    logAction('PRODUCTS_IMPORTED_BATCH', 'Product', { count: created.length });
    return { importedCount: created.length };
  };

  const resetToDemoData = () => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('resetToDemoData is disabled in production mode.');
      return;
    }
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
