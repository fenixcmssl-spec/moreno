import prisma from '@/lib/prisma';
import { OrderService, OrderDTO } from './order.service';
import { CouponService } from './coupon.service';

export interface StorefrontItemInput {
  productId?: string;
  id?: string;
  title?: string;
  price?: number;
  quantity: number;
  image?: string;
  sku?: string;
  variant?: any;
}

export interface StorefrontTotalsParams {
  items: StorefrontItemInput[];
  couponCode?: string;
  couponDiscountPct?: number;
  shippingMethod?: 'correos_express' | 'correos_standard' | string;
  freeShippingThreshold?: number;
  taxRate?: number; // default 0.21 (IVA 21%)
  currency?: string;
  tenantId?: string;
}

export interface StorefrontTotalsCalculation {
  subtotal: number;
  discount: number;
  couponApplied?: string;
  shippingCost: number;
  carrierName: string;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export interface CreateStorefrontOrderParams {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  items: StorefrontItemInput[];
  paymentMethod: 'stripe' | 'paypal' | 'bizum' | 'redsys' | 'bank_transfer' | 'cash_on_delivery' | string;
  shippingMethod?: 'correos_express' | 'correos_standard' | string;
  couponCode?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface StorefrontOrderResult {
  success: boolean;
  order: any;
  error?: string;
}

export class StorefrontCheckoutService {
  /**
   * 1. Secure Server-side computation of Storefront Totals from PostgreSQL
   */
  static async calculateSecureTotals(
    tenantId: string,
    items: { productId: string; quantity: number }[],
    couponCode?: string,
    shippingMethod: string = 'correos_express'
  ): Promise<StorefrontTotalsCalculation> {
    if (!tenantId || !Array.isArray(items) || items.length === 0) {
      return {
        subtotal: 0,
        discount: 0,
        shippingCost: 0,
        carrierName: 'Correos Express 24h',
        taxRate: 0.21,
        taxAmount: 0,
        total: 0,
        currency: 'EUR'
      };
    }

    const productIds = items.map(i => i.productId);
    const dbProducts = await (prisma as any).product.findMany({
      where: {
        id: { in: productIds },
        tenantId
      }
    });

    const productMap = new Map<string, any>();
    for (const p of dbProducts) {
      productMap.set(p.id, p);
    }

    let subtotal = 0;
    for (const item of items) {
      const p = productMap.get(item.productId);
      if (p && (p.status === 'active' || p.status === 'published' || p.status === 'ACTIVE' || p.status === 'PUBLISHED')) {
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const price = Number(p.price) || 0;
        subtotal += price * qty;
      }
    }
    subtotal = Math.round(subtotal * 100) / 100;

    let discount = 0;
    let couponApplied: string | undefined = undefined;

    if (couponCode && couponCode.trim().length > 0) {
      const normCode = couponCode.trim().toUpperCase();
      const couponRecord = await (prisma as any).coupon.findUnique({
        where: {
          tenantId_code: { tenantId, code: normCode }
        }
      });

      if (couponRecord && couponRecord.status === 'ACTIVE') {
        const isNotExpired = !couponRecord.expiresAt || new Date(couponRecord.expiresAt).getTime() >= Date.now();
        const hasUsesLeft = couponRecord.maxUses === null || couponRecord.usedCount < couponRecord.maxUses;
        const meetsMinSpend = couponRecord.minSpend === null || subtotal >= Number(couponRecord.minSpend);

        if (isNotExpired && hasUsesLeft && meetsMinSpend) {
          if (couponRecord.discountType === 'PERCENTAGE') {
            discount = Math.round(((subtotal * Number(couponRecord.discountValue)) / 100) * 100) / 100;
            discount = Math.min(discount, subtotal);
          } else {
            discount = Math.min(Number(couponRecord.discountValue), subtotal);
          }
          couponApplied = normCode;
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discount);
    const freeShippingThreshold = 50.0;
    const isFreeShipping = discountedSubtotal >= freeShippingThreshold;
    let shippingCost = 0;
    let carrierName = 'Correos Express 24h';

    if (!isFreeShipping) {
      if (shippingMethod === 'correos_standard') {
        shippingCost = 2.49;
        carrierName = 'Correos Paq Estándar 48/72h';
      } else {
        shippingCost = 3.99;
        carrierName = 'Correos Express 24h';
      }
    } else {
      carrierName = shippingMethod === 'correos_standard'
        ? 'Correos Paq Estándar (Envío Gratis)'
        : 'Correos Express 24h (Envío Gratis)';
    }

    const taxRate = 0.21;
    const taxBase = discountedSubtotal + shippingCost;
    const taxAmount = Math.round((taxBase * taxRate) * 100) / 100;
    const total = Math.round((taxBase + taxAmount) * 100) / 100;

    return {
      subtotal,
      discount,
      couponApplied,
      shippingCost,
      carrierName,
      taxRate,
      taxAmount,
      total,
      currency: 'EUR'
    };
  }

  /**
   * Synchronous fallback calculation if needed for offline estimations
   */
  static calculateTotals(params: StorefrontTotalsParams): StorefrontTotalsCalculation {
    const {
      items = [],
      couponCode,
      couponDiscountPct = 0,
      shippingMethod = 'correos_express',
      freeShippingThreshold = 50.0,
      taxRate = 0.21,
      currency = 'EUR'
    } = params;

    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (price * qty);
    }, 0);

    let discountPct = couponDiscountPct;
    if (couponCode && couponCode.toUpperCase() === 'FENIX10') {
      discountPct = 10;
    }
    const discount = discountPct > 0 ? Math.round((subtotal * (discountPct / 100)) * 100) / 100 : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);

    // Shipping rules: Free shipping over freeShippingThreshold (default 50€)
    const isFreeShipping = discountedSubtotal >= freeShippingThreshold;
    let shippingCost = 0;
    let carrierName = 'Correos Express 24h';

    if (!isFreeShipping) {
      if (shippingMethod === 'correos_standard') {
        shippingCost = 2.49;
        carrierName = 'Correos Paq Estándar 48/72h';
      } else {
        shippingCost = 3.99;
        carrierName = 'Correos Express 24h';
      }
    } else {
      carrierName = shippingMethod === 'correos_standard' 
        ? 'Correos Paq Estándar (Envío Gratis)' 
        : 'Correos Express 24h (Envío Gratis)';
    }

    // Tax calculation (IVA 21%)
    const taxBase = discountedSubtotal + shippingCost;
    const taxAmount = Math.round((taxBase * taxRate) * 100) / 100;
    const total = Math.round((taxBase + taxAmount) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount,
      couponApplied: discount > 0 ? (couponCode || `${discountPct}% DESCUENTO`) : undefined,
      shippingCost,
      carrierName,
      taxRate,
      taxAmount,
      total,
      currency
    };
  }

  /**
   * 2. Transactional Order Creation via OrderService in PostgreSQL
   */
  static async createOrder(params: CreateStorefrontOrderParams): Promise<StorefrontOrderResult> {
    return this.createStorefrontOrder(params);
  }

  static async createStorefrontOrder(params: CreateStorefrontOrderParams): Promise<StorefrontOrderResult> {
    const formattedItems = params.items.map(item => ({
      productId: item.productId || item.id || '',
      quantity: Number(item.quantity) || 1,
      variant: item.variant
    }));

    const result = await OrderService.createOrder({
      tenantId: params.tenantId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      shippingAddress: params.shippingAddress,
      items: formattedItems,
      paymentMethod: params.paymentMethod,
      shippingMethod: params.shippingMethod,
      couponCode: params.couponCode,
      notes: params.notes,
      idempotencyKey: params.idempotencyKey
    });

    if (!result.success || !result.order) {
      return {
        success: false,
        error: result.error || 'No se pudo procesar el pedido',
        order: null
      };
    }

    return {
      success: true,
      order: result.order
    };
  }

  /**
   * 3. Retrieves tenant storefront orders (strictly isolated by tenantId via PostgreSQL)
   */
  static async getOrdersByTenant(tenantId: string): Promise<OrderDTO[]> {
    if (!tenantId) return [];
    const result = await OrderService.listOrders(tenantId);
    return result.orders;
  }

  /**
   * 4. Retrieves single storefront order by ID or OrderNumber
   */
  static async getOrderById(orderIdOrNumber: string, tenantId?: string): Promise<OrderDTO | null> {
    if (!orderIdOrNumber) return null;
    if (tenantId) {
      return OrderService.getOrder(tenantId, orderIdOrNumber);
    }
    const order = await (prisma as any).order.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }]
      },
      include: { orderItems: true }
    });
    if (!order) return null;
    return OrderService.getOrder(order.tenantId, order.id);
  }
}
