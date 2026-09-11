import { NextRequest, NextResponse } from 'next/server';
import { SaaSCheckoutService } from '@/lib/services/saas-checkout.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      applicationId = 'app_ecommerce',
      planId,
      tenantId,
      tenantSlug,
      tenantName,
      customerName,
      customerEmail,
      billingPeriod = 'monthly',
      provider = 'STRIPE',
      billingAddress
    } = body;

    if (!planId || !customerName || !customerEmail || !tenantSlug) {
      return NextResponse.json({
        success: false,
        error: 'Campos obligatorios incompletos (planId, customerName, customerEmail, tenantSlug)'
      }, { status: 400 });
    }

    const session = await SaaSCheckoutService.createSession({
      applicationId,
      planId,
      tenantId,
      tenantSlug,
      tenantName: tenantName || tenantSlug,
      customerName,
      customerEmail,
      billingPeriod: billingPeriod === 'yearly' ? 'yearly' : 'monthly',
      provider: provider.toUpperCase() === 'PAYPAL' ? 'PAYPAL' : 'STRIPE',
      billingAddress
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error inicializando checkout SaaS'
    }, { status: 500 });
  }
}
