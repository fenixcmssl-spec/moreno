import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { AuditService } from './audit.service';
import { CouponService } from './coupon.service';

export interface OrderItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
  variant?: any;
}

export interface ShippingAddressInput {
  address: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface CreateOrderParams {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: ShippingAddressInput;
  items: OrderItemInput[];
  paymentMethod: string;
  shippingMethod?: string;
  couponCode?: string;
  notes?: string;
  idempotencyKey?: string;
  currency?: string;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId?: string | null;
  title: string;
  sku?: string | null;
  price: number;
  quantity: number;
  total: number;
  variant?: any;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  tenantId: string;
  orderNumber: string;
  idempotencyKey?: string | null;
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: string;
  fulfillmentStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  shippingAddress?: any;
  items: any[];
  orderItems?: OrderItemDTO[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class OrderService {
  /**
   * Generates a clean, unique order number (e.g., FNX-98214-A7B2)
   */
  static generateOrderNumber(): string {
    const timePart = Date.now().toString().slice(-6);
    const randPart = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    return `FNX-${timePart}-${randPart}`;
  }

  /**
   * Generates a realistic tracking number for logistics
   */
  static generateTrackingNumber(carrierName: string = 'Correos Express'): string {
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000);
    return `CE${randomDigits}ES`;
  }

  /**
   * CREATE: Transactional creation of Order, OrderItems, Customer updates, Stock decrements
   * ZERO TRUST SECURITY ENFORCED:
   * - Ignores any client-supplied price, subtotal, tax, discount, total, status
   * - Fetches genuine prices and stock from PostgreSQL
   * - Enforces tenant ownership of products, coupons, customers, and orders
   * - Prevents race conditions with atomic conditional decrements
   * - Backed by persistent idempotency key support
   */
  static async createOrder(params: CreateOrderParams): Promise<{ success: boolean; order?: OrderDTO; error?: string }> {
    const {
      tenantId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items,
      paymentMethod,
      shippingMethod = 'correos_express',
      couponCode,
      notes,
      idempotencyKey
    } = params;

    // 1. Basic Parameter Assertions
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      return { success: false, error: 'Tenant ID es requerido' };
    }
    if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
      return { success: false, error: 'Email de cliente inválido' };
    }
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return { success: false, error: 'El nombre del cliente es obligatorio' };
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'El carrito no contiene productos válidos' };
    }

    // 2. Strict Quantity Validation (anti-tamper: reject 0, negative, floats, NaN, Infinity, absurd numbers)
    for (const item of items) {
      const rawQty = item.quantity;
      if (
        typeof rawQty !== 'number' ||
        !Number.isInteger(rawQty) ||
        rawQty <= 0 ||
        !Number.isFinite(rawQty) ||
        Number.isNaN(rawQty)
      ) {
        return { success: false, error: `Cantidad inválida para el producto: ${rawQty}. Debe ser un número entero positivo.` };
      }
      if (rawQty > 1000) {
        return { success: false, error: `La cantidad solicitada (${rawQty}) excede el límite permitido por pedido (1000 unidades).` };
      }
      if (!item.productId || typeof item.productId !== 'string' || item.productId.trim().length === 0) {
        return { success: false, error: 'Identificador de producto inválido en el carrito' };
      }
    }

    // 3. Idempotency Check: prevent duplicate orders on network retry / double click
    if (idempotencyKey && idempotencyKey.trim().length > 0) {
      try {
        const existingOrder = await (prisma as any).order.findFirst({
          where: {
            tenantId,
            idempotencyKey: idempotencyKey.trim()
          },
          include: {
            orderItems: true,
            customer: true
          }
        });

        if (existingOrder) {
          return {
            success: true,
            order: this.mapToDTO(existingOrder)
          };
        }
      } catch (err) {
        // If query fails, continue to transactional flow
      }
    }

    try {
      // Execute entire order creation atomically in a PostgreSQL transaction
      const resultOrder = await (prisma as any).$transaction(async (tx: any) => {
        // 3.1 Verify Tenant exists and is active
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId }
        });
        if (!tenant) {
          throw new Error(`Comercio no encontrado: ${tenantId}`);
        }
        if (tenant.status && tenant.status !== 'active' && tenant.status !== 'ACTIVE') {
          throw new Error(`El comercio no está activo para recibir pedidos`);
        }

        const tenantCurrency = tenant.currency || 'EUR';

        // 3.2 Fetch genuine products from PostgreSQL and verify tenant isolation
        const productIds = Array.from(new Set(items.map(i => i.productId)));
        const allDbProducts = await tx.product.findMany({
          where: {
            id: { in: productIds }
          }
        });

        // Verify product existence
        if (allDbProducts.length !== productIds.length) {
          const foundIds = new Set(allDbProducts.map((p: any) => p.id));
          const missing = productIds.filter(id => !foundIds.has(id));
          throw new Error(`Uno o más productos no existen: ${missing.join(', ')}`);
        }

        // Verify strict tenant ownership of each product (Prevent Cross-Tenant Tampering)
        for (const p of allDbProducts) {
          if (p.tenantId !== tenantId) {
            throw new Error(`Violación de seguridad: El producto "${p.title}" no pertenece a este comercio (cross-tenant denied)`);
          }
          const pStatus = (p.status || '').toLowerCase();
          if (pStatus !== 'active' && pStatus !== 'published') {
            throw new Error(`El producto "${p.title}" no está disponible para compra (estado: ${p.status})`);
          }
        }

        const productMap = new Map<string, any>();
        for (const p of allDbProducts) {
          productMap.set(p.id, p);
        }

        // 3.3 Validate stock & calculate authentic server-side subtotal
        let calculatedSubtotal = 0;
        const verifiedItems: {
          productId: string;
          title: string;
          sku?: string | null;
          price: number;
          quantity: number;
          total: number;
          variant?: any;
        }[] = [];

        for (const item of items) {
          const product = productMap.get(item.productId);
          const requestedQty = item.quantity;

          // Atomic conditional stock decrement in PostgreSQL to prevent race conditions
          const updateResult = await tx.product.updateMany({
            where: {
              id: product.id,
              tenantId,
              stock: { gte: requestedQty }
            },
            data: {
              stock: { decrement: requestedQty }
            }
          });

          if (updateResult.count === 0) {
            throw new Error(
              `Stock insuficiente para "${product.title}". Stock disponible insuficiente para cubrir ${requestedQty} unidades.`
            );
          }

          // Use STRICT PostgreSQL server price (never trust client price)
          const linePrice = Number(product.price);
          const lineTotal = Math.round(linePrice * requestedQty * 100) / 100;
          calculatedSubtotal += lineTotal;

          verifiedItems.push({
            productId: product.id,
            title: product.title,
            sku: product.sku || null,
            price: linePrice,
            quantity: requestedQty,
            total: lineTotal,
            variant: item.variant || null
          });
        }

        calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

        // 3.4 Process Coupon if provided (with tenant isolation and atomic usage counter)
        let discount = 0;
        let couponRecord: any = null;

        if (couponCode && typeof couponCode === 'string' && couponCode.trim().length > 0) {
          const normCode = couponCode.trim().toUpperCase();
          couponRecord = await tx.coupon.findUnique({
            where: {
              tenantId_code: { tenantId, code: normCode }
            }
          });

          if (!couponRecord) {
            throw new Error(`El cupón "${normCode}" no existe en este comercio`);
          }
          if (couponRecord.tenantId !== tenantId) {
            throw new Error(`Violación de seguridad: El cupón "${normCode}" no pertenece a este comercio`);
          }
          if (couponRecord.status !== 'ACTIVE') {
            throw new Error(`El cupón "${normCode}" está inactivo`);
          }
          if (couponRecord.expiresAt && new Date(couponRecord.expiresAt).getTime() < Date.now()) {
            throw new Error(`El cupón "${normCode}" ha expirado`);
          }
          if (couponRecord.maxUses !== null && couponRecord.usedCount >= couponRecord.maxUses) {
            throw new Error(`El cupón "${normCode}" ha alcanzado el límite de usos permitidos`);
          }
          if (couponRecord.minSpend !== null && calculatedSubtotal < Number(couponRecord.minSpend)) {
            throw new Error(
              `El pedido mínimo para aplicar el cupón "${normCode}" es de ${Number(couponRecord.minSpend).toFixed(2)}€`
            );
          }

          if (couponRecord.discountType === 'PERCENTAGE') {
            discount = Math.round(((calculatedSubtotal * Number(couponRecord.discountValue)) / 100) * 100) / 100;
            discount = Math.min(discount, calculatedSubtotal);
          } else {
            discount = Math.min(Number(couponRecord.discountValue), calculatedSubtotal);
          }

          // Atomically increment coupon usage with concurrency guard
          const couponUpdate = await tx.coupon.updateMany({
            where: {
              id: couponRecord.id,
              tenantId,
              status: 'ACTIVE',
              OR: [
                { maxUses: null },
                { usedCount: { lt: couponRecord.maxUses } }
              ]
            },
            data: { usedCount: { increment: 1 } }
          });

          if (couponUpdate.count === 0) {
            throw new Error(`El cupón "${normCode}" ha alcanzado su límite de usos permitidos.`);
          }
        }

        const discountedSubtotal = Math.max(0, calculatedSubtotal - discount);

        // 3.5 Calculate Shipping Cost & Carrier
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

        // 3.6 Calculate Taxes (IVA 21%) strictly on server
        const taxRate = 0.21;
        const taxBase = discountedSubtotal + shippingCost;
        const taxAmount = Math.round((taxBase * taxRate) * 100) / 100;
        const finalTotal = Math.round((taxBase + taxAmount) * 100) / 100;

        // 3.7 Find or Create Customer strictly within tenant
        const cleanEmail = customerEmail.trim().toLowerCase();
        let customer = await tx.customer.findUnique({
          where: {
            tenantId_email: { tenantId, email: cleanEmail }
          }
        });

        if (customer) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: customerName.trim() || customer.name,
              phone: customerPhone?.trim() || customer.phone,
              address: shippingAddress || customer.address,
              ordersCount: { increment: 1 },
              totalSpent: { increment: finalTotal }
            }
          });
        } else {
          const customerId = `cust_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
          customer = await tx.customer.create({
            data: {
              id: customerId,
              tenantId,
              name: customerName.trim(),
              email: cleanEmail,
              phone: customerPhone?.trim() || null,
              address: shippingAddress || null,
              ordersCount: 1,
              totalSpent: finalTotal
            }
          });
        }

        // 3.8 Create Order record (strictly initializes as pending payment)
        const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const orderNumber = this.generateOrderNumber();
        const trackingNumber = this.generateTrackingNumber(carrierName);

        // Security rule: checkout always creates an order in pending status
        // Payment must be confirmed through legitimate payment webhook / provider flow
        const orderStatus = 'pending';
        const fulfillmentStatus = 'unfulfilled';
        const paymentStatus = 'pending';

        const order = await tx.order.create({
          data: {
            id: orderId,
            tenantId,
            customerId: customer.id,
            orderNumber,
            idempotencyKey: idempotencyKey?.trim() || null,
            customerName: customerName.trim(),
            customerEmail: cleanEmail,
            customerPhone: customerPhone?.trim() || null,
            currency: tenantCurrency,
            subtotal: calculatedSubtotal,
            discount,
            shippingCost,
            tax: taxAmount,
            total: finalTotal,
            status: orderStatus,
            fulfillmentStatus,
            paymentMethod: (paymentMethod || 'stripe').toLowerCase(),
            paymentStatus,
            carrier: carrierName,
            trackingNumber,
            shippingAddress: shippingAddress as any,
            items: verifiedItems as any,
            notes: notes?.trim() || null,
            orderItems: {
              create: verifiedItems.map(item => ({
                id: `oit_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
                productId: item.productId,
                title: item.title,
                sku: item.sku || null,
                price: item.price,
                quantity: item.quantity,
                total: item.total,
                variant: item.variant || null
              }))
            }
          },
          include: {
            orderItems: true
          }
        });

        return order;
      });

      // Audit log asynchronously after successful commit
      AuditService.log({
        tenantId,
        userEmail: customerEmail,
        action: 'STOREFRONT_ORDER_CREATED',
        entity: 'Order',
        entityId: resultOrder.orderNumber,
        details: {
          total: resultOrder.total,
          itemsCount: items.length,
          paymentMethod,
          paymentStatus: resultOrder.paymentStatus,
          idempotencyKey: idempotencyKey || null
        }
      });

      return {
        success: true,
        order: this.mapToDTO(resultOrder)
      };
    } catch (err: any) {
      console.error('Order creation error:', err);
      return {
        success: false,
        error: err?.message || 'Error procesando el pedido'
      };
    }
  }

  /**
   * READ: Get a single order with strict tenant isolation
   */
  static async getOrder(tenantId: string, orderIdOrNumber: string): Promise<OrderDTO | null> {
    if (!tenantId || !orderIdOrNumber) return null;

    const order = await (prisma as any).order.findFirst({
      where: {
        tenantId,
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber }
        ]
      },
      include: {
        orderItems: true,
        customer: true
      }
    });

    if (!order) return null;
    return this.mapToDTO(order);
  }

  /**
   * LIST: List orders for a tenant with filters
   */
  static async listOrders(
    tenantId: string,
    options?: {
      status?: string;
      customerId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ orders: OrderDTO[]; total: number }> {
    if (!tenantId) {
      return { orders: [], total: 0 };
    }

    const whereClause: any = { tenantId };

    if (options?.status && options.status !== 'ALL') {
      whereClause.status = options.status.toLowerCase();
    }

    if (options?.customerId) {
      whereClause.customerId = options.customerId;
    }

    if (options?.search) {
      const q = options.search.trim();
      whereClause.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { trackingNumber: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
        include: {
          orderItems: true
        }
      }),
      (prisma as any).order.count({ where: whereClause })
    ]);

    return {
      orders: items.map(this.mapToDTO),
      total
    };
  }

  /**
   * UPDATE STATUS: Update order / fulfillment / payment status (Staff/Admin only)
   */
  static async updateOrderStatus(
    tenantId: string,
    orderId: string,
    updates: {
      status?: string;
      fulfillmentStatus?: string;
      paymentStatus?: string;
      trackingNumber?: string;
      carrier?: string;
    }
  ): Promise<OrderDTO> {
    if (!tenantId || !orderId) {
      throw new Error('Tenant ID y Order ID son obligatorios');
    }

    const existing = await (prisma as any).order.findFirst({
      where: { id: orderId, tenantId },
      include: { orderItems: true }
    });

    if (!existing) {
      throw new Error('Pedido no encontrado o no pertenece a este comercio');
    }

    // If order transitions to cancelled/refunded, restore stock atomically
    const isNowCancelled = updates.status === 'cancelled' || updates.status === 'refunded';
    const wasAlreadyCancelled = existing.status === 'cancelled' || existing.status === 'refunded';

    if (isNowCancelled && !wasAlreadyCancelled) {
      await (prisma as any).$transaction(async (tx: any) => {
        for (const item of existing.orderItems) {
          if (item.productId) {
            await tx.product.updateMany({
              where: { id: item.productId, tenantId },
              data: { stock: { increment: item.quantity } }
            }).catch(() => {});
          }
        }
      });
    }

    const data: any = {};
    if (updates.status) data.status = updates.status;
    if (updates.fulfillmentStatus) data.fulfillmentStatus = updates.fulfillmentStatus;
    if (updates.paymentStatus) data.paymentStatus = updates.paymentStatus;
    if (updates.trackingNumber !== undefined) data.trackingNumber = updates.trackingNumber;
    if (updates.carrier !== undefined) data.carrier = updates.carrier;

    const updated = await (prisma as any).order.update({
      where: { id: orderId },
      data,
      include: { orderItems: true }
    });

    return this.mapToDTO(updated);
  }

  private static mapToDTO(o: any): OrderDTO {
    return {
      id: o.id,
      tenantId: o.tenantId,
      orderNumber: o.orderNumber,
      idempotencyKey: o.idempotencyKey || null,
      customerId: o.customerId,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      currency: o.currency || 'EUR',
      subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0,
      shippingCost: Number(o.shippingCost) || 0,
      tax: Number(o.tax) || 0,
      total: Number(o.total) || 0,
      status: o.status,
      fulfillmentStatus: o.fulfillmentStatus,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      carrier: o.carrier,
      trackingNumber: o.trackingNumber,
      shippingAddress: o.shippingAddress,
      items: Array.isArray(o.items) ? o.items : [],
      orderItems: Array.isArray(o.orderItems)
        ? o.orderItems.map((oi: any) => ({
            id: oi.id,
            orderId: oi.orderId,
            productId: oi.productId,
            title: oi.title,
            sku: oi.sku || null,
            price: Number(oi.price) || 0,
            quantity: Number(oi.quantity) || 1,
            total: Number(oi.total) || 0,
            variant: oi.variant,
            createdAt: oi.createdAt instanceof Date ? oi.createdAt.toISOString() : oi.createdAt
          }))
        : [],
      notes: o.notes || null,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
      updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt
    };
  }
}

