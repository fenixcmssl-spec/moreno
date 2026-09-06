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
  tenantId: z.string().min(1, 'Tenant ID requerido'),
  customerName: z.string().min(2, 'Nombre de cliente requerido'),
  customerEmail: z.string().email('Email de facturación inválido'),
  customerPhone: z.string().min(5, 'Teléfono requerido'),
  shippingAddress: z.object({
    address: z.string().min(3, 'Dirección requerida'),
    city: z.string().min(2, 'Ciudad requerida'),
    state: z.string().optional(),
    postalCode: z.string().min(3, 'Código postal requerido'),
    country: z.string().min(2, 'País requerido')
  }),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    title: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive()
  })).min(1, 'El carrito no puede estar vacío'),
  paymentMethod: z.enum(['paypal', 'stripe', 'bizum', 'redsys', 'cash_on_delivery', 'bank_transfer']),
  shippingMethod: z.string().default('correos_express'),
  couponCode: z.string().optional(),
  notes: z.string().optional()
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
