import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export async function seedDemoData(prisma: PrismaClient) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('❌ [DEMO DATA SECURITY GUARD] Se ha bloqueado la inserción de datos demo en entorno de PRODUCCIÓN.');
  }

  console.log('🧪 [DEMO DATA] Sembrando Tenants Demo (Tenant A: Fenix Market Demo, Tenant B: Milano Style)...');

  // TENANT A: Fenix Demo Store
  const tenantA = await prisma.tenant.upsert({
    where: { id: 'tenant_demo' },
    update: {
      name: 'Fenix Market Demo',
      slug: 'tienda-demo',
      domain: 'demo.fenixcms.es',
      customDomain: 'tienda-demo.es',
      status: 'active',
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      licenseKey: 'FNX-GROWTH-2026-DEMO-9912',
      ownerEmail: 'admin@tienda-demo.es',
      ownerName: 'Admin Tienda Demo',
      themeId: 'theme_modern_minimal',
      currency: 'EUR',
      defaultLocale: 'es',
      supportedLocales: ['es', 'en', 'it', 'fr', 'de', 'pt'],
      branding: {
        primaryColor: '#3b82f6',
        accentColor: '#f59e0b',
        fontFamily: 'Inter, sans-serif'
      },
      settings: {
        storeName: 'Fenix Market Demo',
        tagline: 'Tecnología e Informática de Vanguardia',
        supportEmail: 'soporte@tienda-demo.es',
        phone: '+34 912 345 678',
        address: 'Paseo de la Castellana 100, Madrid',
        taxRate: 21,
        shippingBaseCost: 3.99,
        freeShippingThreshold: 50,
        currency: 'EUR'
      },
      activePlugins: ['plugin_stripe_connect', 'plugin_correos_pro', 'plugin_seo_pro', 'plugin_fenix_all_import']
    },
    create: {
      id: 'tenant_demo',
      name: 'Fenix Market Demo',
      slug: 'tienda-demo',
      domain: 'demo.fenixcms.es',
      customDomain: 'tienda-demo.es',
      status: 'active',
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      licenseKey: 'FNX-GROWTH-2026-DEMO-9912',
      ownerEmail: 'admin@tienda-demo.es',
      ownerName: 'Admin Tienda Demo',
      themeId: 'theme_modern_minimal',
      currency: 'EUR',
      defaultLocale: 'es',
      supportedLocales: ['es', 'en', 'it', 'fr', 'de', 'pt'],
      branding: {
        primaryColor: '#3b82f6',
        accentColor: '#f59e0b',
        fontFamily: 'Inter, sans-serif'
      },
      settings: {
        storeName: 'Fenix Market Demo',
        tagline: 'Tecnología e Informática de Vanguardia',
        supportEmail: 'soporte@tienda-demo.es',
        phone: '+34 912 345 678',
        address: 'Paseo de la Castellana 100, Madrid',
        taxRate: 21,
        shippingBaseCost: 3.99,
        freeShippingThreshold: 50,
        currency: 'EUR'
      },
      activePlugins: ['plugin_stripe_connect', 'plugin_correos_pro', 'plugin_seo_pro', 'plugin_fenix_all_import']
    }
  });

  // TENANT B: Milano Style & Fashion
  const tenantB = await prisma.tenant.upsert({
    where: { id: 'tenant_milano' },
    update: {
      name: 'Milano Style & Luxury',
      slug: 'milanostyle',
      domain: 'milano.fenixcms.es',
      customDomain: 'milanostyle.it',
      status: 'active',
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      licenseKey: 'FNX-GROWTH-2026-MILANO-8833',
      ownerEmail: 'admin@milanostyle.it',
      ownerName: 'Gianluca Rossi',
      themeId: 'theme_fashion_boutique',
      currency: 'EUR',
      defaultLocale: 'it',
      supportedLocales: ['it', 'en', 'es', 'fr', 'de'],
      branding: {
        primaryColor: '#e11d48',
        accentColor: '#fbbf24',
        fontFamily: 'Playfair Display, serif'
      },
      settings: {
        storeName: 'Milano Style & Luxury',
        tagline: 'Alta Moda Italiana e Pelletteria Artigianale',
        supportEmail: 'ciao@milanostyle.it',
        phone: '+39 02 1234 5678',
        address: 'Via Montenapoleone 12, Milano, Italia',
        taxRate: 22,
        shippingBaseCost: 8.50,
        freeShippingThreshold: 150,
        currency: 'EUR'
      },
      activePlugins: ['plugin_stripe_connect', 'plugin_seo_pro']
    },
    create: {
      id: 'tenant_milano',
      name: 'Milano Style & Luxury',
      slug: 'milanostyle',
      domain: 'milano.fenixcms.es',
      customDomain: 'milanostyle.it',
      status: 'active',
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      licenseKey: 'FNX-GROWTH-2026-MILANO-8833',
      ownerEmail: 'admin@milanostyle.it',
      ownerName: 'Gianluca Rossi',
      themeId: 'theme_fashion_boutique',
      currency: 'EUR',
      defaultLocale: 'it',
      supportedLocales: ['it', 'en', 'es', 'fr', 'de'],
      branding: {
        primaryColor: '#e11d48',
        accentColor: '#fbbf24',
        fontFamily: 'Playfair Display, serif'
      },
      settings: {
        storeName: 'Milano Style & Luxury',
        tagline: 'Alta Moda Italiana e Pelletteria Artigianale',
        supportEmail: 'ciao@milanostyle.it',
        phone: '+39 02 1234 5678',
        address: 'Via Montenapoleone 12, Milano, Italia',
        taxRate: 22,
        shippingBaseCost: 8.50,
        freeShippingThreshold: 150,
        currency: 'EUR'
      },
      activePlugins: ['plugin_stripe_connect', 'plugin_seo_pro']
    }
  });

  // Domains demo
  console.log('🌐 [DEMO DATA] Sembrando Dominios Demo...');
  const domainsToSeed = [
    { id: 'dom_demo_sub', tenantId: tenantA.id, hostname: 'demo.fenixcms.es', type: 'SYSTEM_SUBDOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_demo_custom', tenantId: tenantA.id, hostname: 'tienda-demo.es', type: 'CUSTOM_DOMAIN', status: 'active', verified: true, isPrimary: true },
    { id: 'dom_cliente_sub', tenantId: tenantA.id, hostname: 'cliente.fenixcms.es', type: 'SYSTEM_SUBDOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_cliente_custom', tenantId: tenantA.id, hostname: 'cliente.com', type: 'CUSTOM_DOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_milano_sub', tenantId: tenantB.id, hostname: 'milano.fenixcms.es', type: 'SYSTEM_SUBDOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_milano_custom', tenantId: tenantB.id, hostname: 'milanostyle.it', type: 'CUSTOM_DOMAIN', status: 'active', verified: true, isPrimary: true }
  ];

  for (const d of domainsToSeed) {
    await prisma.domain.upsert({
      where: { hostname: d.hostname },
      update: {
        tenantId: d.tenantId,
        type: d.type as any,
        status: d.status,
        verified: d.verified,
        isPrimary: d.isPrimary
      },
      create: {
        id: d.id,
        tenantId: d.tenantId,
        hostname: d.hostname,
        type: d.type as any,
        status: d.status,
        verified: d.verified,
        isPrimary: d.isPrimary
      }
    });
  }

  // Licencias Demo
  console.log('🔑 [DEMO DATA] Sembrando Licencias Demo...');
  const now = new Date();
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const hashKey = (k: string) => crypto.createHash('sha256').update(k.trim().toUpperCase()).digest('hex');

  const licA = await prisma.license.upsert({
    where: { displayKey: tenantA.licenseKey },
    update: {
      tenantId: tenantA.id,
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: oneYearFromNow,
      activationLimit: 3,
      customerName: tenantA.ownerName,
      customerEmail: tenantA.ownerEmail,
      price: 49.00,
      currency: 'EUR',
      billingPeriod: 'monthly'
    },
    create: {
      id: 'lic_seed_demo_growth',
      licenseKeyHash: hashKey(tenantA.licenseKey),
      displayKey: tenantA.licenseKey,
      tenantId: tenantA.id,
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: oneYearFromNow,
      activationLimit: 3,
      activationCount: 2,
      customerName: tenantA.ownerName,
      customerEmail: tenantA.ownerEmail,
      price: 49.00,
      currency: 'EUR',
      billingPeriod: 'monthly'
    }
  });

  await prisma.licenseActivation.upsert({
    where: { id: 'act_seed_demo_sub' },
    update: { licenseId: licA.id, tenantId: tenantA.id, domain: 'demo.fenixcms.es', status: 'ACTIVE' },
    create: { id: 'act_seed_demo_sub', licenseId: licA.id, tenantId: tenantA.id, domain: 'demo.fenixcms.es', environment: 'production', status: 'ACTIVE' }
  });

  await prisma.licenseActivation.upsert({
    where: { id: 'act_seed_demo_custom' },
    update: { licenseId: licA.id, tenantId: tenantA.id, domain: 'tienda-demo.es', status: 'ACTIVE' },
    create: { id: 'act_seed_demo_custom', licenseId: licA.id, tenantId: tenantA.id, domain: 'tienda-demo.es', environment: 'production', status: 'ACTIVE' }
  });

  const licB = await prisma.license.upsert({
    where: { displayKey: tenantB.licenseKey },
    update: {
      tenantId: tenantB.id,
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: oneYearFromNow,
      activationLimit: 3,
      customerName: tenantB.ownerName,
      customerEmail: tenantB.ownerEmail,
      price: 49.00,
      currency: 'EUR',
      billingPeriod: 'monthly'
    },
    create: {
      id: 'lic_seed_milano_growth',
      licenseKeyHash: hashKey(tenantB.licenseKey),
      displayKey: tenantB.licenseKey,
      tenantId: tenantB.id,
      applicationId: 'ECOMMERCE',
      planId: 'plan_growth',
      status: 'ACTIVE',
      startsAt: now,
      expiresAt: oneYearFromNow,
      activationLimit: 3,
      activationCount: 2,
      customerName: tenantB.ownerName,
      customerEmail: tenantB.ownerEmail,
      price: 49.00,
      currency: 'EUR',
      billingPeriod: 'monthly'
    }
  });

  await prisma.licenseActivation.upsert({
    where: { id: 'act_seed_milano_sub' },
    update: { licenseId: licB.id, tenantId: tenantB.id, domain: 'milano.fenixcms.es', status: 'ACTIVE' },
    create: { id: 'act_seed_milano_sub', licenseId: licB.id, tenantId: tenantB.id, domain: 'milano.fenixcms.es', environment: 'production', status: 'ACTIVE' }
  });

  await prisma.licenseActivation.upsert({
    where: { id: 'act_seed_milano_custom' },
    update: { licenseId: licB.id, tenantId: tenantB.id, domain: 'milanostyle.it', status: 'ACTIVE' },
    create: { id: 'act_seed_milano_custom', licenseId: licB.id, tenantId: tenantB.id, domain: 'milanostyle.it', environment: 'production', status: 'ACTIVE' }
  });

  // Categorías y Productos Demo
  console.log('🛍️ [DEMO DATA] Sembrando Categorías y Productos Demo...');
  const catTechA = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: 'electronica' } },
    update: { name: 'Electrónica & Audio', status: 'ACTIVE' },
    create: { id: 'cat_tech_audio', tenantId: tenantA.id, name: 'Electrónica & Audio', slug: 'electronica', status: 'ACTIVE' }
  });

  const catGamingA = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: 'informatica' } },
    update: { name: 'Informática & Gaming', status: 'ACTIVE' },
    create: { id: 'cat_tech_gaming', tenantId: tenantA.id, name: 'Informática & Gaming', slug: 'informatica', status: 'ACTIVE' }
  });

  const productsA = [
    {
      id: 'prod_a_headphones',
      tenantId: tenantA.id,
      categoryId: catTechA.id,
      title: 'Auriculares Inalámbricos Noise Cancelling Pro ANC',
      slug: 'auriculares-noise-cancelling-pro',
      description: 'Cancelación activa de ruido híbrida de 45dB, sonido Hi-Res LDAC y batería de 65 horas con carga ultra rápida.',
      price: 89.99,
      comparePrice: 129.99,
      costPrice: 42.00,
      stock: 45,
      sku: 'TECH-AUD-01',
      category: 'Electrónica',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
      featured: true,
      isBestSeller: true,
      isDeal: true,
      rating: 4.9,
      reviewsCount: 142,
      tags: ['audio', 'bluetooth', 'anc', 'gadget'],
      status: 'ACTIVE'
    },
    {
      id: 'prod_a_smartwatch',
      tenantId: tenantA.id,
      categoryId: catTechA.id,
      title: 'Smartwatch Titan Ultra GPS 49mm AMOLED',
      slug: 'smartwatch-titan-ultra-gps',
      description: 'Pantalla AMOLED de 2.1 pulgadas, caja de titanio aeroespacial, monitor de ECG y resistencia al agua 50 metros.',
      price: 199.50,
      comparePrice: 249.00,
      costPrice: 110.00,
      stock: 28,
      sku: 'TECH-WAT-02',
      category: 'Electrónica',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
      featured: true,
      isBestSeller: true,
      isDeal: false,
      rating: 4.8,
      reviewsCount: 98,
      tags: ['smartwatch', 'titanio', 'gps', 'fitness'],
      status: 'ACTIVE'
    },
    {
      id: 'prod_a_keyboard',
      tenantId: tenantA.id,
      categoryId: catGamingA.id,
      title: 'Teclado Mecánico RGB Hot-Swap Fenix Gaming',
      slug: 'teclado-mecanico-rgb-hotswap',
      description: 'Switches mecánicos lubricados de fábrica, estructura de montaje tipo Gasket Mount y conectividad Tri-Mode Bluetooth 5.2.',
      price: 119.00,
      comparePrice: 149.00,
      costPrice: 65.00,
      stock: 60,
      sku: 'TECH-KEY-03',
      category: 'Informática',
      images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'],
      featured: false,
      isBestSeller: true,
      isDeal: false,
      rating: 4.9,
      reviewsCount: 64,
      tags: ['gaming', 'teclado', 'mecanico', 'rgb'],
      status: 'ACTIVE'
    }
  ];

  for (const prod of productsA) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: { ...prod, status: prod.status as any },
      create: { ...prod, status: prod.status as any }
    });
  }

  const catFashionB = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenantB.id, slug: 'abbigliamento' } },
    update: { name: 'Abbigliamento & Sartoria', status: 'ACTIVE' },
    create: { id: 'cat_milan_fashion', tenantId: tenantB.id, name: 'Abbigliamento & Sartoria', slug: 'abbigliamento', status: 'ACTIVE' }
  });

  const catLeatherB = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenantB.id, slug: 'pelletteria' } },
    update: { name: 'Pelletteria & Borse', status: 'ACTIVE' },
    create: { id: 'cat_milan_leather', tenantId: tenantB.id, name: 'Pelletteria & Borse', slug: 'pelletteria', status: 'ACTIVE' }
  });

  const productsB = [
    {
      id: 'prod_b_jacket',
      tenantId: tenantB.id,
      categoryId: catFashionB.id,
      title: 'Giacca in Vera Pelle Nappa Italiana Milano Sartoriale',
      slug: 'giacca-vera-pelle-nappa-milano',
      description: 'Confezionata artigianalmente a Milano in pelle di agnello nappa di prima scelta. Taglio moderno e finiture metalliche brunite.',
      price: 480.00,
      comparePrice: 650.00,
      costPrice: 210.00,
      stock: 12,
      sku: 'MIL-JAC-01',
      category: 'Moda',
      images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80'],
      featured: true,
      isBestSeller: true,
      isDeal: true,
      rating: 5.0,
      reviewsCount: 37,
      tags: ['moda', 'pelle', 'milano', 'lusso'],
      status: 'ACTIVE'
    },
    {
      id: 'prod_b_bag',
      tenantId: tenantB.id,
      categoryId: catLeatherB.id,
      title: 'Borsa Tote Bag Duomo in Cuoio Conciato al Vegetale',
      slug: 'borsa-tote-duomo-cuoio',
      description: 'Elegante borsa da lavoro e tempo libero realizzata in prestigioso cuoio toscano con scomparto imbottito per notebook 15 pollici.',
      price: 320.00,
      comparePrice: 390.00,
      costPrice: 135.00,
      stock: 18,
      sku: 'MIL-BAG-02',
      category: 'Pelletteria',
      images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80'],
      featured: true,
      isBestSeller: true,
      isDeal: false,
      rating: 4.9,
      reviewsCount: 52,
      tags: ['borsa', 'cuoio', 'artigianale', 'accessori'],
      status: 'ACTIVE'
    }
  ];

  for (const prod of productsB) {
    await prisma.product.upsert({
      where: { id: prod.id },
      update: { ...prod, status: prod.status as any },
      create: { ...prod, status: prod.status as any }
    });
  }

  // Páginas y Blog demo
  console.log('📄 [DEMO DATA] Sembrando Páginas y Artículos Demo...');
  await prisma.page.upsert({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: 'sobre-nosotros' } },
    update: { title: 'Sobre Nosotros - Fenix Market', status: 'PUBLISHED', content: 'Somos líderes en tecnología y periféricos de alto rendimiento.' },
    create: { id: 'page_a_about', tenantId: tenantA.id, title: 'Sobre Nosotros - Fenix Market', slug: 'sobre-nosotros', status: 'PUBLISHED', content: 'Somos líderes en tecnología y periféricos de alto rendimiento.' }
  });

  await prisma.page.upsert({
    where: { tenantId_slug: { tenantId: tenantB.id, slug: 'chi-siamo' } },
    update: { title: 'Chi Siamo - Milano Style Boutique', status: 'PUBLISHED', content: 'Tradizione sartoriale milanese dal 1984.' },
    create: { id: 'page_b_about', tenantId: tenantB.id, title: 'Chi Siamo - Milano Style Boutique', slug: 'chi-siamo', status: 'PUBLISHED', content: 'Tradizione sartoriale milanese dal 1984.' }
  });

  await prisma.blogPost.upsert({
    where: { tenantId_slug: { tenantId: tenantA.id, slug: 'guia-auriculares-2026' } },
    update: {
      title: 'Top 5 Auriculares Inalámbricos para Teletrabajo en 2026',
      status: 'PUBLISHED',
      category: 'Tecnología',
      content: 'Análisis detallado de cancelación de ruido, micrófonos beamforming y duración de batería.',
      excerpt: 'Descubre los mejores auriculares para trabajar sin distracciones.'
    },
    create: {
      id: 'post_a_1',
      tenantId: tenantA.id,
      title: 'Top 5 Auriculares Inalámbricos para Teletrabajo en 2026',
      slug: 'guia-auriculares-2026',
      status: 'PUBLISHED',
      category: 'Tecnología',
      content: 'Análisis detallado de cancelación de ruido, micrófonos beamforming y duración de batería.',
      excerpt: 'Descubre los mejores auriculares para trabajar sin distracciones.'
    }
  });

  await prisma.blogPost.upsert({
    where: { tenantId_slug: { tenantId: tenantB.id, slug: 'tendenze-moda-milano-2026' } },
    update: {
      title: 'Tendenze Moda Milano Fashion Week 2026',
      status: 'PUBLISHED',
      category: 'Moda',
      content: 'I colori e i tagli che domineranno le passerelle della moda maschile e femminile.',
      excerpt: 'Le novità imperdibili presentate durante la settimana della moda milanese.'
    },
    create: {
      id: 'post_b_1',
      tenantId: tenantB.id,
      title: 'Tendenze Moda Milano Fashion Week 2026',
      slug: 'tendenze-moda-milano-2026',
      status: 'PUBLISHED',
      category: 'Moda',
      content: 'I colori e i tagli che domineranno le passerelle della moda maschile e femminile.',
      excerpt: 'Le novità imperdibili presentate durante la semana della moda milanesa.'
    }
  });

  console.log('✅ [DEMO DATA] Datos de demostración sembrados con éxito.');
}
