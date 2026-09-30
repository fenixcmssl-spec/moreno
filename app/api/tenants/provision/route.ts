import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/lib/services/plan.service';
import { ApplicationService } from '@/lib/services/application.service';
import { AuditService } from '@/lib/services/audit.service';
import { AuthService } from '@/lib/services/auth.service';
import { TenantService } from '@/lib/services/tenant.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      applicationId = 'ECOMMERCE',
      planId = 'plan_growth',
      billingPeriod = 'monthly',
      paymentProvider = 'paypal',
      transactionId,
      customerName,
      customerEmail,
      customerPassword,
      storeName,
      storeSlug,
      currency = 'EUR',
      customDomain
    } = body;

    if (!customerEmail || !storeSlug) {
      return NextResponse.json(
        { success: false, error: 'Correo de cliente y slug de tienda son requeridos' },
        { status: 400 }
      );
    }

    const cleanSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const plan = (await PlanService.getById(planId)) || (await PlanService.getBySlug(planId)) || (await PlanService.getAll())[0];
    const app = (await ApplicationService.getByKey(applicationId as any)) || (await ApplicationService.getAll())[0];

    const tenantId = `tenant_${cleanSlug}`;

    // 1. Register user if password provided
    let registeredUserId: string | undefined;
    if (customerPassword) {
      const reg = await AuthService.register({
        name: customerName || storeName || 'Propietario',
        email: customerEmail,
        password: customerPassword,
        role: 'OWNER',
        tenantId,
        tenantSlug: cleanSlug
      });
      if (reg.success && reg.user) {
        registeredUserId = reg.user.id;
      }
    }

    // 2. Atomic Provisioning of Tenant + License + Domain + Membership (FASE 7)
    const result = await TenantService.provisionTenantWithLicenseAsync({
      tenantId,
      name: storeName || 'Mi Tienda Fenix',
      slug: cleanSlug,
      applicationId: app?.key || 'ECOMMERCE',
      planId: plan?.id || planId,
      ownerName: customerName || storeName || 'Propietario',
      ownerEmail: customerEmail,
      ownerUserId: registeredUserId,
      billingPeriod: billingPeriod as any,
      paymentProvider,
      transactionId,
      currency,
      customDomain,
      activationLimit: 3,
      branding: {
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        fontFamily: 'Inter',
        seoTitle: `${storeName || cleanSlug} - Tienda Online Oficial`,
        seoDescription: `Bienvenido a ${storeName || cleanSlug}. Catálogo exclusivo y compras seguras con FenixCMS.`
      },
      settings: {
        storeName: storeName || cleanSlug,
        tagline: 'Tu tienda online de confianza',
        supportEmail: customerEmail,
        phone: '+34 900 000 000',
        address: 'Madrid, España',
        taxRate: 21,
        shippingBaseCost: 4.99,
        freeShippingThreshold: 50
      },
      activePlugins: [
        'plugin_correos_pro',
        'plugin_stripe_connect',
        'plugin_seo_pro',
        'plugin_fenix_all_import'
      ]
    });

    // 3. Audit Logging
    AuditService.log({
      tenantId: result.tenant.id,
      userEmail: customerEmail,
      action: 'TENANT_PROVISIONED',
      entity: 'Tenant',
      entityId: result.tenant.id,
      details: {
        slug: cleanSlug,
        plan: plan?.name || planId,
        application: app?.name || applicationId,
        licenseKey: result.license.displayKey,
        domain: result.defaultDomain
      }
    });

    return NextResponse.json({
      success: true,
      tenant: result.tenant,
      license: result.license,
      redirectUrl: result.redirectUrl,
      message: 'Comercio y licencia aprovisionados atómicamente con éxito'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in POST /api/tenants/provision:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error en el aprovisionamiento del tenant' },
      { status: 500 }
    );
  }
}
