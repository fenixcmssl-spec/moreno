export type SupportedLocale = 'es' | 'it' | 'en' | 'fr' | 'de' | 'pt';

export type DomainRoute = 
  | 'saas_landing'       // fenixcms.es
  | 'saas_admin'         // fenixcms.es/admin
  | 'saas_login'         // fenixcms.es/login
  | 'store_front'        // tutienda.com (escaparate cliente)
  | 'store_admin'        // tutienda.com/admin (backoffice cliente)
  | 'store_login';       // tutienda.com/login (cuenta cliente)

export type UserRole = 'SUPER_ADMIN' | 'TENANT_OWNER' | 'TENANT_ADMIN' | 'EDITOR' | 'CUSTOMER';
export type EntityStatus = 
  | 'ACTIVE' 
  | 'INACTIVE' 
  | 'PENDING' 
  | 'SUSPENDED' 
  | 'EXPIRED' 
  | 'ARCHIVED'
  | 'DRAFT'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'suspended'
  | 'expired'
  | 'archived'
  | 'draft';

// -------------------------------------------------------------
// 1. USUARIOS, SESIONES & SEGURIDAD
// -------------------------------------------------------------

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: EntityStatus;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 2. SISTEMA DE APLICACIONES DINÁMICAS (Fase 1 y 2)
// -------------------------------------------------------------

export type ApplicationTypeKey = 
  | 'ECOMMERCE' 
  | 'BLOG' 
  | 'CLASSIFIEDS' 
  | 'LANDING' 
  | 'BOOKING' 
  | 'DIRECTORY' 
  | 'LMS' 
  | 'FORUM' 
  | 'PORTFOLIO' 
  | 'CUSTOM'
  | 'app_ecommerce'
  | 'app_auctions'
  | 'app_hybrid_auctions_blog'
  | 'app_hybrid_ecommerce_blog'
  | 'app_blog'
  | 'app_classifieds'
  | (string & {});

export interface ApplicationModuleDef {
  id: string;
  applicationId: string;
  key: string; // 'products' | 'orders' | 'posts' | 'ads' | 'bookings'
  name: string;
  description?: string;
  isDefault: boolean;
}

export interface ApplicationDefinition {
  id: string;
  key: ApplicationTypeKey;
  name: string;
  slug: string;
  description: string;
  category?: string;
  status: EntityStatus;
  icon: string;
  version: string;
  modules: ApplicationModuleDef[];
  settingsSchema?: Record<string, any>;
  createdAt: string;
}

// -------------------------------------------------------------
// 3. PLANES & ENTITLEMENTS
// -------------------------------------------------------------

export interface PlanEntitlements {
  'products.max'?: number;
  'storage.max_mb'?: number;
  'domains.max'?: number;
  'users.max'?: number;
  'ai.enabled'?: boolean;
  'plugins.allowed'?: string[];
  'customTheme.enabled'?: boolean;
  'blog.posts_max'?: number;
  'classifieds.ads_max'?: number;
  'booking.calendars_max'?: number;
  [key: string]: any;
}

export interface SaaSPlan {
  id: string;
  applicationId: string; // Ligado a Application (ECOMMERCE, BLOG, CLASSIFIEDS...)
  name: string;
  slug: string;
  badge?: string;
  imageUrl?: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  entitlements: PlanEntitlements;
  // Campos auxiliares de compatibilidad
  maxProducts?: number;
  maxStorageMb?: number;
  customDomainAllowed?: boolean;
  features: string[];
  popular?: boolean;
  status: EntityStatus;
}

// -------------------------------------------------------------
// 4. LICENCIAS Y SUSCRIPCIONES
// -------------------------------------------------------------

export interface SaaSLicense {
  id: string;
  tenantId: string;
  applicationId: string; // Tipo de aplicación (ECOMMERCE, BLOG, etc.)
  planId: string;
  planName: string;
  licenseKey: string;
  status: 'active' | 'pending' | 'suspended' | 'expired';
  customerName: string;
  customerEmail: string;
  tenantSlug: string;
  tenantName: string;
  imageUrl?: string;
  logoUrl?: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  paymentProvider: 'paypal' | 'stripe' | 'manual';
  transactionId: string;
  validFrom: string;
  validTo: string;
  autoRenew?: boolean;
  entitlements?: PlanEntitlements;
  maxProducts?: number;
  maxStorageMb?: number;
  createdAt: string;
}

export interface SubscriptionItem {
  id: string;
  tenantId: string;
  applicationId: string;
  planId: string;
  provider: 'paypal' | 'stripe' | 'manual';
  providerSubscriptionId?: string;
  status: EntityStatus;
  billingPeriod: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | string;
  issuedAt: string;
  paidAt?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  billingDetails?: {
    name: string;
    email: string;
    address?: string;
    taxId?: string;
    [key: string]: any;
  };
}

export type Product = ProductItem;
export type Order = StoreOrder;

// -------------------------------------------------------------
// 5. TENANT, DOMINIOS & BRANDING
// -------------------------------------------------------------

export interface DomainItem {
  id: string;
  tenantId: string;
  hostname: string;
  type: 'subdomain' | 'custom';
  verified: boolean;
  primary: boolean;
  sslStatus: 'active' | 'pending' | 'error';
  createdAt: string;
}

export interface TenantBranding {
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  mobileLogoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface TenantStore {
  id: string;
  name: string;
  slug: string;
  domain: string;
  customDomain?: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  applicationId: string; // Aplicación principal activa
  enabledApplications?: ApplicationTypeKey[]; // Múltiples aplicaciones asignadas
  planId: string;
  licenseKey: string;
  ownerEmail: string;
  ownerName: string;
  themeId: string;
  currency: string;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  branding: TenantBranding;
  settings: {
    storeName: string;
    tagline: string;
    logoUrl?: string;
    supportEmail: string;
    phone: string;
    address: string;
    taxRate: number;
    shippingBaseCost: number;
    freeShippingThreshold: number;
    [key: string]: any;
  };
  activePlugins: string[];
  createdAt: string;
}

// -------------------------------------------------------------
// 6. MEDIATECA & ARCHIVOS
// -------------------------------------------------------------

export interface MediaItem {
  id: string;
  tenantId: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 7. CMS CORE: PÁGINAS, MENÚS Y SEO
// -------------------------------------------------------------

export interface CMSPage {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  content: string;
  status: EntityStatus;
  isHomepage?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: string;
}

export interface CMSMenuItem {
  id: string;
  title: string;
  url: string;
  order: number;
  target?: '_self' | '_blank';
}

export interface CMSMenu {
  id: string;
  tenantId: string;
  name: string;
  location: 'header' | 'footer' | 'sidebar';
  items: CMSMenuItem[];
}

// -------------------------------------------------------------
// 8. E-COMMERCE: PRODUCTOS, PEDIDOS, CUPONES
// -------------------------------------------------------------

export interface ProductVariant {
  id: string;
  productId: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  options: Record<string, string>;
}

export interface ProductItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number;
  comparePrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  stock: number;
  rating: number;
  reviewsCount: number;
  images: string[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isDeal?: boolean;
  dealDiscountPercent?: number;
  tags: string[];
  attributes?: {
    brand?: string;
    color?: string;
    weight?: string;
    dimensions?: string;
    warranty?: string;
    [key: string]: any;
  };
  variants?: ProductVariant[];
  translations?: Record<string, { title?: string; description?: string; }>;
  image?: string;
  badge?: string;
  oldPrice?: number;
  status: EntityStatus;
  createdAt: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface StoreOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address?: string;
    street?: string;
    city: string;
    postalCode: string;
    province?: string;
    state?: string;
    country: string;
  };
  items: {
    productId: string;
    title: string;
    price: number;
    quantity: number;
    image?: string;
    sku: string;
  }[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount?: number;
  total: number;
  paymentMethod: 'paypal' | 'stripe' | 'bizum' | 'redsys' | 'cod' | 'cash_on_delivery' | 'bank_transfer' | string;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  status?: string;
  orderStatus?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  fulfillmentStatus?: 'unfulfilled' | 'processing' | 'fulfilled' | 'shipped' | 'delivered' | string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  createdAt: string;
}

export interface CouponItem {
  id: string;
  tenantId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minSpend?: number;
  usedCount: number;
  status: EntityStatus;
}

export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 9. BLOG / NOTICIAS
// -------------------------------------------------------------

export interface BlogPost {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: {
    name: string;
    avatarUrl?: string;
  };
  featuredImage: string;
  tags: string[];
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string;
  viewsCount: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  postsCount: number;
}

// -------------------------------------------------------------
// 10. CLASIFICADOS / ANUNCIOS
// -------------------------------------------------------------

export interface ClassifiedAdItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  categoryId: string;
  price: number;
  location: string;
  images: string[];
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'SOLD' | 'EXPIRED' | 'REJECTED';
  featured: boolean;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  attributes?: Record<string, string | number>;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
}

export interface ClassifiedCategoryItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon?: string;
  adsCount: number;
}

// -------------------------------------------------------------
// 11. PLUGINS & TEMAS
// -------------------------------------------------------------

export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  applicationScope: ApplicationTypeKey | 'ALL';
  permissions: string[];
  hooks: string[];
  settingsSchema?: Record<string, any>;
  dependencies?: Record<string, string>;
}

export interface PluginDefinition {
  id: string;
  key: string;
  name: string;
  slug?: string;
  description: string;
  author: string;
  version: string;
  category: 'shipping' | 'payments' | 'payment' | 'marketing' | 'seo' | 'analytics' | 'tools' | 'classifieds' | 'blog' | 'import' | 'ai' | 'theme' | string;
  applicationScope?: ApplicationTypeKey | 'ALL';
  icon?: string;
  iconName?: string;
  status?: EntityStatus;
  installed?: boolean;
  enabled?: boolean;
  isEnabled?: boolean;
  manifest?: PluginManifest;
  config: Record<string, any>;
  hasSettings?: boolean;
  settingsFields?: any[];
  requiresApiKey?: boolean;
  isCore?: boolean;
  [key: string]: any;
}

export interface ThemeBlockSection {
  id: string;
  type: 'header' | 'hero' | 'featured_grid' | 'product_grid' | 'post_grid' | 'ad_grid' | 'cta' | 'testimonials' | 'footer' | 'productGrid' | 'postGrid' | 'adGrid' | 'text' | string;
  title?: string;
  subtitle?: string;
  content?: string;
  enabled?: boolean;
  order?: number;
  settings?: Record<string, any>;
}

export interface ThemeDefinition {
  id: string;
  key: string;
  name: string;
  slug?: string;
  description: string;
  author?: string;
  version?: string;
  applicationScope?: ApplicationTypeKey | 'ALL';
  status?: EntityStatus;
  previewImage: string;
  badge?: string;
  tags?: string[];
  palette?: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
  };
  colors?: {
    primary: string;
    secondary?: string;
    accent: string;
    headerBg: string;
    headerText: string;
    background?: string;
    surface?: string;
    text?: string;
    bg?: string;
    [key: string]: any;
  };
  typography?: {
    fontHeading?: string;
    fontBody?: string;
    headingFont?: string;
    bodyFont?: string;
    [key: string]: any;
  };
  layout?: Record<string, any>;
  sections?: ThemeBlockSection[];
  installed?: boolean;
  active?: boolean;
}

export interface MarketplaceItem {
  id: string;
  slug?: string;
  type: 'plugin' | 'theme';
  name: string;
  shortDescription?: string;
  description: string;
  price: number;
  billingType?: 'one_time' | 'subscription' | 'subscription_monthly' | 'subscription_yearly' | string;
  category: string;
  applicationScope?: ApplicationTypeKey | 'ALL';
  author?: string;
  rating?: number;
  downloadsCount?: number;
  salesCount?: number;
  previewImage?: string;
  version?: string;
  badge?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  downloadFileName?: string;
  createdAt?: string;
}
