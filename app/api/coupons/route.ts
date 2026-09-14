import { NextRequest, NextResponse } from 'next/server';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { CouponService } from '@/lib/services/coupon.service';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedTenantId = searchParams.get('tenantId');
    const validateCode = searchParams.get('validate');
    const subtotal = searchParams.get('subtotal') ? Number(searchParams.get('subtotal')) : 0;

    // Public / Storefront Validation Mode
    if (validateCode) {
      let targetTenantId = requestedTenantId;
      if (!targetTenantId) {
        const publicContext = await TenantContextHelper.resolvePublicTenant(req);
        targetTenantId = publicContext?.tenant?.id || 'tenant_demo';
      }

      const validation = await CouponService.validateCoupon(targetTenantId, validateCode, subtotal);
      if (!validation.valid) {
        return NextResponse.json({
          valid: false,
          error: validation.reason || 'Cupón inválido'
        }, { status: 400 });
      }

      return NextResponse.json({
        valid: true,
        coupon: validation.coupon,
        discountAmount: validation.discountAmount
      });
    }

    // Admin Listing Mode
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: requestedTenantId || undefined
    });
    if (!auth.success) return auth.response;

    const { tenant } = auth.context;
    const { coupons, total } = await CouponService.listCoupons(tenant.id);

    return NextResponse.json({
      coupons,
      total,
      tenantId: tenant.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error procesando cupones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    if (!body.code || body.discountValue === undefined) {
      return NextResponse.json({ error: 'Código y valor de descuento son requeridos' }, { status: 400 });
    }

    const coupon = await CouponService.createCoupon(tenant.id, {
      code: body.code,
      discountType: body.discountType || 'PERCENTAGE',
      discountValue: Number(body.discountValue),
      minSpend: body.minSpend !== undefined ? Number(body.minSpend) : undefined,
      maxUses: body.maxUses !== undefined ? Number(body.maxUses) : undefined,
      expiresAt: body.expiresAt,
      status: body.status || 'ACTIVE'
    });

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      entityId: coupon.id,
      details: { code: coupon.code, discountValue: coupon.discountValue, discountType: coupon.discountType }
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando cupón' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de cupón requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF', {
      targetTenantId: body.tenantId
    });
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    const updated = await CouponService.updateCoupon(tenant.id, id, updates);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'COUPON_UPDATED',
      entity: 'Coupon',
      entityId: id,
      details: { updatedFields: Object.keys(updates) }
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando cupón' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de cupón requerido' }, { status: 400 });
    }

    const auth = await TenantContextHelper.requireTenantRole(req, 'ADMIN');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    await CouponService.deleteCoupon(tenant.id, id);

    AuditService.log({
      tenantId: tenant.id,
      userId: session?.userId,
      userEmail: session?.email,
      action: 'COUPON_DELETED',
      entity: 'Coupon',
      entityId: id
    });

    return NextResponse.json({ success: true, message: 'Cupón eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando cupón' }, { status: 500 });
  }
}
