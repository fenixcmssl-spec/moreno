import prisma from '@/lib/prisma';
import crypto from 'crypto';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponDTO {
  id: string;
  tenantId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minSpend?: number | null;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minSpend?: number;
  maxUses?: number;
  expiresAt?: string | Date;
  status?: string;
}

export interface UpdateCouponInput {
  code?: string;
  discountType?: DiscountType;
  discountValue?: number;
  minSpend?: number | null;
  maxUses?: number | null;
  expiresAt?: string | Date | null;
  status?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDTO;
  discountAmount: number;
  reason?: string;
}

export class CouponService {
  /**
   * CREATE: Create a new promotional coupon for a tenant
   */
  static async createCoupon(tenantId: string, input: CreateCouponInput): Promise<CouponDTO> {
    if (!tenantId) {
      throw new Error('Tenant ID es requerido');
    }
    if (!input.code || input.code.trim().length === 0) {
      throw new Error('El código del cupón es obligatorio');
    }
    if (input.discountValue === undefined || input.discountValue <= 0) {
      throw new Error('El valor del descuento debe ser mayor que cero');
    }
    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
      throw new Error('El descuento porcentual no puede exceder el 100%');
    }

    const code = input.code.trim().toUpperCase();

    // Check duplicate code within tenant
    const existing = await (prisma as any).coupon.findUnique({
      where: {
        tenantId_code: { tenantId, code }
      }
    });

    if (existing) {
      throw new Error(`El código de cupón "${code}" ya existe en esta tienda`);
    }

    const couponId = `cup_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    const created = await (prisma as any).coupon.create({
      data: {
        id: couponId,
        tenantId,
        code,
        discountType: input.discountType,
        discountValue: Number(input.discountValue),
        minSpend: input.minSpend !== undefined ? Number(input.minSpend) : null,
        maxUses: input.maxUses !== undefined ? Number(input.maxUses) : null,
        usedCount: 0,
        expiresAt,
        status: input.status || 'ACTIVE'
      }
    });

    return this.mapToDTO(created);
  }

  /**
   * READ: Get coupon by Code or ID within a tenant
   */
  static async getCoupon(tenantId: string, codeOrId: string): Promise<CouponDTO | null> {
    if (!tenantId || !codeOrId) return null;

    const normalized = codeOrId.trim().toUpperCase();
    const coupon = await (prisma as any).coupon.findFirst({
      where: {
        tenantId,
        OR: [
          { id: codeOrId },
          { code: normalized }
        ]
      }
    });

    if (!coupon) return null;
    return this.mapToDTO(coupon);
  }

  /**
   * LIST: List coupons for a tenant
   */
  static async listCoupons(tenantId: string): Promise<{ coupons: CouponDTO[]; total: number }> {
    if (!tenantId) {
      return { coupons: [], total: 0 };
    }

    const [items, total] = await Promise.all([
      (prisma as any).coupon.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      }),
      (prisma as any).coupon.count({ where: { tenantId } })
    ]);

    return {
      coupons: items.map(this.mapToDTO),
      total
    };
  }

  /**
   * UPDATE: Update a coupon
   */
  static async updateCoupon(tenantId: string, id: string, updates: UpdateCouponInput): Promise<CouponDTO> {
    if (!tenantId || !id) {
      throw new Error('Tenant ID e ID de cupón son requeridos');
    }

    const existing = await (prisma as any).coupon.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Cupón no encontrado o no pertenece a este comercio');
    }

    const data: any = {};

    if (updates.code !== undefined) {
      const code = updates.code.trim().toUpperCase();
      const conflict = await (prisma as any).coupon.findFirst({
        where: { tenantId, code, id: { not: id } }
      });
      if (conflict) {
        throw new Error(`El código "${code}" ya está en uso en esta tienda`);
      }
      data.code = code;
    }

    if (updates.discountType !== undefined) {
      data.discountType = updates.discountType;
    }

    if (updates.discountValue !== undefined) {
      const val = Number(updates.discountValue);
      if (isNaN(val) || val <= 0) {
        throw new Error('El valor del descuento debe ser mayor que cero');
      }
      const dtype = updates.discountType || existing.discountType;
      if (dtype === 'PERCENTAGE' && val > 100) {
        throw new Error('El porcentaje no puede ser mayor a 100%');
      }
      data.discountValue = val;
    }

    if (updates.minSpend !== undefined) {
      data.minSpend = updates.minSpend !== null ? Number(updates.minSpend) : null;
    }

    if (updates.maxUses !== undefined) {
      data.maxUses = updates.maxUses !== null ? Number(updates.maxUses) : null;
    }

    if (updates.expiresAt !== undefined) {
      data.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;
    }

    if (updates.status !== undefined) {
      data.status = updates.status;
    }

    const updated = await (prisma as any).coupon.update({
      where: { id },
      data
    });

    return this.mapToDTO(updated);
  }

  /**
   * DELETE: Delete coupon
   */
  static async deleteCoupon(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId || !id) return false;

    const existing = await (prisma as any).coupon.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Cupón no encontrado o no pertenece a este comercio');
    }

    await (prisma as any).coupon.delete({
      where: { id }
    });

    return true;
  }

  /**
   * VALIDATE: Validates a coupon against a cart subtotal and calculates discount
   */
  static async validateCoupon(
    tenantId: string,
    code: string,
    cartSubtotal: number
  ): Promise<CouponValidationResult> {
    if (!tenantId || !code) {
      return { valid: false, discountAmount: 0, reason: 'Código de cupón requerido' };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check in PostgreSQL
    const coupon = await (prisma as any).coupon.findUnique({
      where: {
        tenantId_code: { tenantId, code: normalizedCode }
      }
    });

    if (!coupon) {
      return { valid: false, discountAmount: 0, reason: 'El cupón no existe en esta tienda' };
    }

    if (coupon.status !== 'ACTIVE') {
      return { valid: false, discountAmount: 0, reason: 'El cupón se encuentra inactivo o caducado' };
    }

    // Check expiration date
    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return { valid: false, discountAmount: 0, reason: 'El cupón ha caducado' };
    }

    // Check max uses limit
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discountAmount: 0, reason: 'El cupón ha alcanzado el límite máximo de usos' };
    }

    // Check minimum spend threshold
    if (coupon.minSpend !== null && cartSubtotal < Number(coupon.minSpend)) {
      return {
        valid: false,
        discountAmount: 0,
        reason: `El pedido mínimo para aplicar este cupón es de ${Number(coupon.minSpend).toFixed(2)}€`
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = Math.round(((cartSubtotal * Number(coupon.discountValue)) / 100) * 100) / 100;
      discountAmount = Math.min(discountAmount, cartSubtotal);
    } else {
      // FIXED_AMOUNT
      discountAmount = Math.min(Number(coupon.discountValue), cartSubtotal);
    }

    return {
      valid: true,
      coupon: this.mapToDTO(coupon),
      discountAmount: Math.round(discountAmount * 100) / 100
    };
  }

  private static mapToDTO(c: any): CouponDTO {
    return {
      id: c.id,
      tenantId: c.tenantId,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minSpend: c.minSpend !== null && c.minSpend !== undefined ? Number(c.minSpend) : null,
      maxUses: c.maxUses !== null && c.maxUses !== undefined ? Number(c.maxUses) : null,
      usedCount: Number(c.usedCount) || 0,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
      status: c.status,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt
    };
  }
}
