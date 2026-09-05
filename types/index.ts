export type SupportedLocale = 'es' | 'it' | 'en' | 'fr' | 'de' | 'pt';

export type DomainRoute = 
  | 'saas_landing'       // fenixcms.es
  | 'saas_admin'         // fenixcms.es/admin
  | 'saas_login'         // fenixcms.es/login
  | 'store_front'        // tutienda.com (escaparate cliente)
  | 'store_admin'        // tutienda.com/admin (backoffice cliente)
  | 'store_login';       // tutienda.com/login (cuenta cliente)

export interface SaaSPlan {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  maxProducts: number;
  maxStorageMb: number;
  customDomainAllowed: boolean;
  features: string[];
  popular?: boolean;
}

export interface SaaSLicense {
  id: string;
  licenseKey: string;
  planId: string;
  planName: string;
  status: 'active' | 'pending' | 'suspended' | 'expired';
  customerName: string;
  customerEmail: string;
  tenantSlug: string;
  tenantName: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  paymentProvider: 'paypal' | 'stripe' | 'manual';
  transactionId: string;
  validFrom: string;
  validTo: string;
  maxProducts: number;
  maxStorageMb: number;
  createdAt: string;
}

export interface TenantStore {
  id: string;
  name: string;
  slug: string;
  domain: string;
  customDomain?: string;
  status: 'active' | 'suspended' | 'trial' | 'expired';
  planId: string;
  licenseKey: string;
  ownerEmail: string;
  ownerName: string;
  themeId: string;
  currency: string;
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
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
  };
  activePlugins: string[];
  createdAt: string;
}

export interface ProductItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  compareAtPrice?: number;
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
  };
  translations?: Partial<Record<SupportedLocale, { title: string; description: string }>>;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
}

export interface CartItem {
  product: ProductItem;
  quantity: number;
  selectedColor?: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
}

export interface StoreOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: 'paypal' | 'stripe' | 'bank_transfer' | 'cash_on_delivery';
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'processing' | 'shipped' | 'delivered';
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface PluginDefinition {
  id: string;
  key: string;
  name: string;
  category: 'payment' | 'shipping' | 'import' | 'ai' | 'marketing' | 'seo';
  description: string;
  version: string;
  author: string;
  iconName: string;
  isEnabled: boolean;
  isCore?: boolean;
  config: Record<string, any>;
  settingsFields?: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea';
    options?: { label: string; value: string }[];
    defaultValue?: any;
    placeholder?: string;
    helperText?: string;
  }[];
}

export interface ThemeDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  previewImage: string;
  badge?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    headerBg: string;
    headerText: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  layout: {
    bannerStyle: 'fenix_deal_slider' | 'fenix_marketplace_slider' | 'hero_minimal' | 'modern_grid';
    productCardStyle: 'fenix_dense' | 'fenix_high_density' | 'clean_card' | 'bordered';
  };
}

export interface ImportMapping {
  titleField: string;
  priceField: string;
  skuField: string;
  stockField: string;
  categoryField: string;
  descriptionField: string;
  imageField: string;
  compareAtPriceField?: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  slug: string;
  type: 'plugin' | 'theme';
  category: string;
  description: string;
  shortDescription: string;
  price: number;
  billingType: 'one_time' | 'subscription_monthly' | 'subscription_yearly' | 'free';
  previewImage?: string;
  badge?: string;
  author: string;
  version: string;
  rating: number;
  salesCount: number;
  isPublished: boolean;
  isFeatured?: boolean;
  downloadFileName?: string;
  createdAt: string;
}
