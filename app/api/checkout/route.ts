import { NextRequest, NextResponse } from 'next/server';
import { CheckoutSchema } from '@/lib/validators';
import { StorefrontCheckoutService } from '@/lib/services/storefront-checkout.service';
import { AuditService } from '@/lib/services/audit.service';
import { SecurityService } from '@/lib/security/security.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting protection against card testing and automated abuse
    const rateLimit = SecurityService.applyRateLimit(req, 15, 60, 'checkout_orders');
    if (rateLimit.limited && rateLimit.response) {
      return rateLimit.response;
    }

    const rawBody = await req.json();
    const body = SecurityService.sanitizePayload(rawBody);
    const validated = CheckoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de pedido inválidos',
        issues: validated.error.issues
      }, { status: 400 });
    }

    // 2. Resolve Tenant Authority (Domain / Hostname / Slug or Session - NEVER blindly trust body.tenantId)
    let targetTenantId: string | undefined;

    const publicContext = await TenantContextHelper.resolvePublicTenant(req);
    if (publicContext?.tenant?.id) {
      targetTenantId = publicContext.tenant.id;
    }

    // If session exists with tenant context
    const session = await TenantContextHelper.getSessionFromRequest(req);
    if (session?.tenantId && !targetTenantId) {
      targetTenantId = session.tenantId;
    }

    // If still not resolved from domain/session, verify body tenantId existence in PostgreSQL
    if (!targetTenantId && validated.data.tenantId) {
      const verifiedTenant = await TenantContextHelper.findTenantByIdOrSlug(validated.data.tenantId);
      if (verifiedTenant) {
        targetTenantId = verifiedTenant.id;
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar la tienda correspondiente para este pedido.'
      }, { status: 400 });
    }

    // Check if client tried to spoof another tenantId
    if (validated.data.tenantId && validated.data.tenantId !== targetTenantId) {
      const spoofTenant = await TenantContextHelper.findTenantByIdOrSlug(validated.data.tenantId);
      if (spoofTenant && spoofTenant.id !== targetTenantId) {
        return NextResponse.json({
          success: false,
          error: 'Violación de seguridad: El tenant especificado no coincide con la tienda activa.'
        }, { status: 403 });
      }
    }

    // 3. Extract Idempotency Key (from header or body)
    const idempotencyKey = req.headers.get('x-idempotency-key') || validated.data.idempotencyKey || undefined;

    const { items, paymentMethod, shippingMethod, couponCode, customerName, customerEmail, customerPhone, shippingAddress, notes } = validated.data;

    // 4. Process order with StorefrontCheckoutService & OrderService (Server recalculates all prices, stock, coupons)
    const result = await StorefrontCheckoutService.createStorefrontOrder({
      tenantId: targetTenantId,
      customerName,
      customerEmail,
      customerPhone: customerPhone || undefined,
      shippingAddress: {
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state || shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country
      },
      items,
      paymentMethod,
      shippingMethod,
      couponCode,
      notes,
      idempotencyKey
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error creando pedido en tienda'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order: result.order
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error en el procesamiento del checkout'
    }, { status: 500 });
  }
}

