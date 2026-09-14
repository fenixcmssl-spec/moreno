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
