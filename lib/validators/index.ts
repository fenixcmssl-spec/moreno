import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  tenantSlug: z.string().optional()
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['SUPER_ADMIN', 'TENANT_OWNER', 'TENANT_ADMIN', 'EDITOR', 'CUSTOMER']).default('CUSTOMER')
});

export const CheckoutSchema = z.object({
  tenantId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  customerName: z.string().min(2, 'Nombre de cliente requerido'),
  customerEmail: z.string().email('Email de facturación inválido'),
  customerPhone: z.string().min(5, 'Teléfono requerido').optional().or(z.literal('')),
  shippingAddress: z.object({
    address: z.string().min(3, 'Dirección requerida'),
    city: z.string().min(2, 'Ciudad requerida'),
    state: z.string().optional(),
    postalCode: z.string().min(3, 'Código postal requerido'),
    country: z.string().min(2, 'País requerido')
  }),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID requerido'),
    id: z.string().optional(),
    variantId: z.string().optional(),
    title: z.string().optional(),
    price: z.number().optional(),
    quantity: z.number().int({ message: 'La cantidad debe ser un número entero' }).positive('La cantidad debe ser mayor a cero').max(1000, 'Cantidad no puede exceder 1000 unidades')
  })).min(1, 'El carrito no puede estar vacío'),
  paymentMethod: z.enum(['paypal', 'stripe', 'bizum', 'redsys', 'cash_on_delivery', 'bank_transfer']).default('stripe'),
  shippingMethod: z.string().default('correos_express'),
  couponCode: z.string().optional(),
  notes: z.string().optional()
});

export const CategorySchema = z.object({
  name: z.string().min(2, 'Nombre de categoría requerido'),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const ProductSchema = z.object({
  title: z.string().min(2, 'Título del producto requerido'),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  comparePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().default('General'),
  categoryId: z.string().optional(),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isDeal: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.any()).optional(),
  variants: z.array(z.any()).optional(),
  translations: z.record(z.string(), z.any()).optional(),
  status: z.enum(['active', 'draft', 'archived', 'ACTIVE', 'DRAFT', 'ARCHIVED']).default('active')
});

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Nombre de cliente requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.record(z.string(), z.any()).optional()
});

export const CouponSchema = z.object({
  code: z.string().min(2, 'Código de cupón requerido'),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
  discountValue: z.number().positive('El valor del descuento debe ser mayor que 0'),
  minSpend: z.number().min(0).optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const PluginManifestSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/, 'Clave debe ser alfanumérica en minúsculas'),
  name: z.string().min(3),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Versión semántica inválida (ej. 1.0.0)'),
  author: z.string().min(2),
  description: z.string().min(5),
  applicationScope: z.enum(['ECOMMERCE', 'BLOG', 'CLASSIFIEDS', 'LANDING', 'BOOKING', 'LMS', 'ALL']),
  minCmsVersion: z.string().default('1.0.0'),
  hooks: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  settingsSchema: z.record(z.string(), z.any()).optional()
});

export const ThemeSectionSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'hero', 'text', 'image', 'productGrid', 'postGrid', 'adGrid', 'cta', 'footer']),
  title: z.string().optional(),
  settings: z.record(z.string(), z.any()),
  order: z.number().default(0)
});

export const ThemeBuilderConfigSchema = z.object({
  themeId: z.string(),
  sections: z.array(ThemeSectionSchema),
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    surface: z.string(),
    accent: z.string(),
    text: z.string()
  }).optional(),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string()
  }).optional()
});

export const TenantCreateSchema = z.object({
  name: z.string().min(2, 'Nombre de tienda requerido').max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug debe contener sólo letras minúsculas, números y guiones').min(3).max(50),
  ownerEmail: z.string().email('Email de propietario inválido'),
  ownerName: z.string().min(2).max(100),
  planId: z.string().min(1, 'Plan ID requerido'),
  applicationId: z.enum(['ECOMMERCE', 'BLOG', 'BLOG_ADS', 'CLASSIFIEDS', 'BOOKING', 'LMS', 'DIRECTORY', 'LANDING', 'BUSINESS']).default('ECOMMERCE'),
  domain: z.string().optional(),
  customDomain: z.string().optional(),
  currency: z.string().length(3).default('EUR'),
  defaultLocale: z.enum(['es', 'it', 'en', 'fr', 'de', 'pt', 'ht']).default('es'),
  supportedLocales: z.array(z.enum(['es', 'it', 'en', 'fr', 'de', 'pt', 'ht'])).default(['es'])
});

export const DomainCreateSchema = z.object({
  hostname: z.string().min(3).max(253).regex(/^[a-z0-9.-]+$/, 'Nombre de host inválido'),
  type: z.enum(['SYSTEM_SUBDOMAIN', 'CUSTOM_DOMAIN']).default('CUSTOM_DOMAIN'),
  isPrimary: z.boolean().default(false)
});

export const PlanCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50),
  applicationId: z.string().min(1),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().min(0),
  yearlyPrice: z.number().min(0),
  currency: z.string().length(3).default('EUR'),
  trialDays: z.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
  entitlements: z.record(z.string(), z.any()).optional()
});

export const PlanEntitlementAdminSchema = z.object({
  planId: z.string().min(1),
  key: z.string().min(2).max(100),
  value: z.string(),
  type: z.enum(['NUMBER', 'BOOLEAN', 'STRING', 'ARRAY', 'JSON']).default('STRING'),
  description: z.string().optional()
});

export const LicenseCreateAdminSchema = z.object({
  tenantId: z.string().min(1),
  planId: z.string().min(1),
  applicationId: z.string().min(1),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  activationLimit: z.number().int().min(1).default(1)
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Límite máximo es 100 por página').default(20),
  search: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc')
});

export interface ApiStandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export function formatApiSuccess<T>(data: T, meta?: any, requestId?: string): ApiStandardResponse<T> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    ...(requestId ? { requestId } : {})
  };
}

export function formatApiError(code: string, message: string, details?: any, requestId?: string): ApiStandardResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    ...(requestId ? { requestId } : {})
  };
}
