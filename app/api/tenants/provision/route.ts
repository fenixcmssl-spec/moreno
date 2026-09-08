import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/services/license.service';
import { PlanService } from '@/lib/services/plan.service';
import { ApplicationService } from '@/lib/services/application.service';
import { AuditService } from '@/lib/services/audit.service';
import { AuthService } from '@/lib/services/auth.service';
import { TenantStore } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      applicationId = 'ECOMMERCE',
      planId = 'plan_pro',
      billingPeriod = 'monthly',
      paymentProvider = 'paypal',
      transactionId,
      customerName,
      customerEmail,
      customerPassword,
      storeName,
      storeSlug,
      currency = 'EUR'
    } = body;

    if (!customerEmail || !storeSlug) {
      return NextResponse.json(
        { success: false, error: 'Correo de cliente y slug de tienda son requeridos' },
        { status: 400 }
      );
    }

    const cleanSlug = storeSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const plan = PlanService.getById(planId) || PlanService.getAll()[0];
    const app = ApplicationService.getByKey(applicationId as any) || ApplicationService.getAll()[0];

    // 1. Generate secure license
    const { displayKey } = LicenseService.generateSecureLicenseKey(
      app.key || 'ECO',
      plan.slug || 'PRO',
      cleanSlug
    );

    const tenantId = `tenant_${Date.now()}`;
    const price = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

    // 2. Register user if password provided
    if (customerPassword) {
      await AuthService.register({
        name: customerName || storeName || 'Propietario',
        email: customerEmail,
        password: customerPassword,
        role: 'TENANT_OWNER',
        tenantId,
        tenantSlug: cleanSlug
      });
    }

    // 3. Create License
    const license = LicenseService.create({
      tenantId,
      applicationId: app.key || 'ECOMMERCE',
      planId: plan.id,
      planName: plan.name,
      licenseKey: displayKey,
      status: 'active',
      customerName: customerName || 'Comerciante',
      customerEmail,
      tenantSlug: cleanSlug,
      tenantName: storeName || cleanSlug,
      price,
      billingPeriod,
      paymentProvider,
      transactionId: transactionId || `tx_${Date.now()}`,
      validFrom: now.toISOString(),
      validTo: expiry.toISOString(),
      entitlements: plan.entitlements,
      maxProducts: plan.maxProducts || plan.entitlements['products.max'],
      maxStorageMb: plan.maxStorageMb || plan.entitlements['storage.max_mb']
    });

    // 4. Activate License for default subdomain
    const defaultSubdomain = `${cleanSlug}.fenixcms.es`;
    LicenseService.activate({
      licenseKey: displayKey,
      tenantId,
      domain: defaultSubdomain,
      environment: 'production'
    });

    // 5. Build Initial Provisioned Tenant
    const provisionedTenant: TenantStore = {
      id: tenantId,
      name: storeName || 'Mi Tienda Fenix',
      slug: cleanSlug,
      domain: defaultSubdomain,
      status: 'active',
      applicationId: app.key || 'ECOMMERCE',
      enabledApplications: [app.key as any || 'ECOMMERCE'],
      planId: plan.id,
      licenseKey: displayKey,
      ownerEmail: customerEmail,
      ownerName: customerName || 'Propietario',
      themeId: 'theme_modern_luxe',
      currency,
      defaultLocale: 'es',
      supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
      branding: {
        primaryColor: '#6366f1',
        accentColor: '#10b981',
        fontFamily: 'Inter',
        seoTitle: `${storeName || cleanSlug} - Tienda Online Oficial`,
        seoDescription: `Bienvenido a ${storeName || cleanSlug}. Catálogo exclusivo y compras seguras con FenixCMS.`
      },
      settings: {
        storeName: storeName || 'Mi Tienda',
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
      ],
      createdAt: now.toISOString()
    };

    // 6. Audit Logging
    AuditService.log({
      tenantId,
      action: 'TENANT_PROVISIONED',
      entity: 'Tenant',
      entityId: tenantId,
      details: {
        slug: cleanSlug,
        plan: plan.name,
        application: app.name,
        licenseKey: displayKey,
        domain: defaultSubdomain
      }
    });

    return NextResponse.json({
      success: true,
      tenant: provisionedTenant,
      license,
      redirectUrl: `/admin?tenant=${cleanSlug}`,
      message: 'Comercio provisionado con éxito'
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error en el aprovisionamiento del tenant' },
      { status: 500 }
    );
  }
}
