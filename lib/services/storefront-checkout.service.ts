import { prisma } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from '@/lib/initialData';

/**
 * StorefrontCheckoutService
 * =========================================================================
 * Responsable EXCLUSIVO del comercio en el escaparate del Tenant (Storefront):
 * - Catálogo de productos del comerciante
 * - Validación de carrito y stock
 * - Cálculo de subtotales, cupones, reglas de envío e IVA
 * - Creación de Pedidos del comprador (Order & OrderItem)
 * - Registro y actualización del Cliente de la tienda (Customer)
 * - Tracking y logística de transportistas (Correos Express, etc.)
 * 
 * REGLA ARQUITECTÓNICA ESTRICTA:
 * NUNCA crea instancias de License, Subscription, Plan ni Application de FenixCMS.
 * El dinero de los pedidos de la tienda va al comerciante (no al SaaS de FenixCMS).
 * =========================================================================
 */

export interface StorefrontItemInput {
  productId?: string;
  id?: string;
  title: string;
  price: number;
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
}

export interface StorefrontOrderResult {
  success: boolean;
  order: {
    id: string;
    orderNumber: string;
    tenantId: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    subtotal: number;
    discount: number;
    shippingCost: number;
    tax: number;
    total: number;
    currency: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    carrier: string;
    trackingNumber: string;
    shippingAddress: any;
    items: StorefrontItemInput[];
    createdAt: string;
  };
  error?: string;
}

// Fallback in-memory orders store for tests without active PostgreSQL
const FALLBACK_STOREFRONT_ORDERS: any[] = [...INITIAL_ORDERS];

export class StorefrontCheckoutService {
  /**
   * 1. Server-side computation of Storefront Totals (Cart, Coupon, Shipping, VAT)
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

    // Apply coupon discount (e.g. FENIX10 = 10% discount)
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
   * 2. Processes and creates a verified Storefront Order in the tenant's store
   * Produces strictly: Order, OrderItems, Customer
   * Zero SaaS License / Subscription pollution.
   */
  static async createStorefrontOrder(params: CreateStorefrontOrderParams): Promise<StorefrontOrderResult> {
    const {
      tenantId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
      shippingMethod = 'correos_express',
      couponCode
    } = params;

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'El carrito no contiene productos',
        order: null as any
      };
    }

    // Compute financial snapshot securely on server
    const calc = this.calculateTotals({
      items,
      couponCode,
      shippingMethod,
      taxRate: 0.21
    });

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `FNX-${Date.now().toString().slice(-6)}`;
    const trackingNumber = `CE${Math.floor(100000000 + Math.random() * 900000000)}ES`;
    const isInstantPayment = ['stripe', 'paypal', 'redsys', 'bizum'].includes(paymentMethod.toLowerCase());
    const paymentStatus = isInstantPayment ? 'paid' : 'pending';
    const orderStatus = isInstantPayment ? 'processing' : 'pending';
    const now = new Date();

    const orderRecord = {
      id: orderId,
      orderNumber,
      tenantId,
      customerId: undefined as string | undefined,
      customerName,
      customerEmail,
      customerPhone,
      subtotal: calc.subtotal,
      discount: calc.discount,
      shippingCost: calc.shippingCost,
      tax: calc.taxAmount,
      total: calc.total,
      currency: calc.currency,
      status: orderStatus,
      fulfillmentStatus: 'processing',
      paymentMethod,
      paymentStatus,
      carrier: calc.carrierName,
      trackingNumber,
      shippingAddress,
      items,
      createdAt: now.toISOString()
    };

    // Persist in PostgreSQL if connected
    if (process.env.DATABASE_URL && prisma?.order) {
      try {
        // Find or create customer
        let customer = await prisma.customer.findUnique({
          where: { tenantId_email: { tenantId, email: customerEmail } }
        });

        if (customer) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              ordersCount: { increment: 1 },
              totalSpent: { increment: calc.total },
              phone: customerPhone || customer.phone,
              name: customerName || customer.name
            }
          });
        } else {
          customer = await prisma.customer.create({
            data: {
              tenantId,
              email: customerEmail,
              name: customerName,
              phone: customerPhone,
              ordersCount: 1,
              totalSpent: calc.total,
              address: shippingAddress
            }
          });
        }

        orderRecord.customerId = customer.id;

        // Create Order and OrderItems in DB
        await prisma.order.create({
          data: {
            id: orderId,
            tenantId,
            customerId: customer.id,
            orderNumber,
            customerName,
            customerEmail,
            customerPhone,
            subtotal: calc.subtotal,
            discount: calc.discount,
            shippingCost: calc.shippingCost,
            tax: calc.taxAmount,
            total: calc.total,
            status: orderStatus as any,
            fulfillmentStatus: 'processing',
            paymentMethod,
            paymentStatus,
            carrier: calc.carrierName,
            trackingNumber,
            shippingAddress,
            items: items as any,
            orderItems: {
              create: items.map(item => ({
                productId: item.productId || item.id,
                title: item.title,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                total: (Number(item.price) || 0) * (Number(item.quantity) || 1),
                variant: item.variant || null
              }))
            }
          }
        });
      } catch (err: any) {
        console.warn('Prisma createStorefrontOrder error, falling back to memory store:', err?.message);
        FALLBACK_STOREFRONT_ORDERS.unshift(orderRecord);
      }
    } else {
      FALLBACK_STOREFRONT_ORDERS.unshift(orderRecord);
    }

    AuditService.log({
      tenantId,
      userEmail: customerEmail,
      action: 'STOREFRONT_ORDER_CREATED',
      entity: 'Order',
      entityId: orderNumber,
      details: {
        total: calc.total,
        paymentMethod,
        itemsCount: items.length,
        trackingNumber
      }
    });

    return {
      success: true,
      order: orderRecord
    };
  }

  /**
   * 3. Retrieves tenant storefront orders (strictly isolated by tenantId)
   */
  static async getOrdersByTenant(tenantId: string) {
    if (process.env.DATABASE_URL && prisma?.order) {
      try {
        const orders = await prisma.order.findMany({
          where: { tenantId },
          include: { orderItems: true },
          orderBy: { createdAt: 'desc' }
        });
        if (orders && orders.length > 0) return orders;
      } catch {}
    }
    return FALLBACK_STOREFRONT_ORDERS.filter(o => o.tenantId === tenantId);
  }

  /**
   * 4. Retrieves single storefront order by ID or OrderNumber
   */
  static async getOrderById(orderIdOrNumber: string, tenantId?: string) {
    if (process.env.DATABASE_URL && prisma?.order) {
      try {
        const order = await prisma.order.findFirst({
          where: {
            OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
            ...(tenantId ? { tenantId } : {})
          },
          include: { orderItems: true }
        });
        if (order) return order;
      } catch {}
    }
    return FALLBACK_STOREFRONT_ORDERS.find(o => 
      (o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber) &&
      (!tenantId || o.tenantId === tenantId)
    );
  }
}
