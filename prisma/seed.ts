import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SEED_APPLICATIONS = [
  {
    id: 'app_ecommerce',
    key: 'ECOMMERCE',
    name: 'Fenix E-commerce Pro',
    slug: 'ecommerce',
    description: 'Plataforma completa de venta online con catálogo, variantes, carrito, pasarelas de pago, envíos y facturación integrada.',
    status: 'ACTIVE',
    version: '2.5.0',
    icon: 'ShoppingCart',
    category: 'E-commerce',
    modules: [
      { key: 'products', name: 'Catálogo de Productos', description: 'Gestión de productos, variantes, atributos y stock', isDefault: true },
      { key: 'orders', name: 'Gestión de Pedidos & Envíos', description: 'Control de estados, albaranes, tracking y reembolsos', isDefault: true },
      { key: 'coupons', name: 'Cupones & Promociones', description: 'Descuentos porcentuales, fijos y reglas automáticas', isDefault: true },
      { key: 'gateways', name: 'Pasarelas de Pago Multi-Moneda', description: 'Stripe, PayPal, Redsys, Bizum y transferencia', isDefault: true },
      { key: 'inventory', name: 'Control de Inventario Avanzado', description: 'Alertas de stock bajo y multi-almacén', isDefault: true },
      { key: 'import_pro', name: 'Fenix All Import Pro', description: 'Importación y exportación de productos por CSV/XML', isDefault: false }
    ]
  },
  {
    id: 'app_blog',
    key: 'BLOG',
    name: 'Fenix Blog & Magazine',
    slug: 'blog',
    description: 'Sistema editorial para publicaciones, revistas digitales y noticias con categorías, autores, SEO avanzado y comentarios.',
    status: 'ACTIVE',
    version: '2.0.0',
    icon: 'Newspaper',
    category: 'Contenido',
    modules: [
      { key: 'posts', name: 'Entradas & Artículos', description: 'Editor enriquecido con bloques visuales y SEO', isDefault: true },
      { key: 'categories', name: 'Categorías y Etiquetas', description: 'Taxonomías y jerarquías ilimitadas', isDefault: true },
      { key: 'authors', name: 'Gestión de Autores & Editores', description: 'Perfiles de redactor y firmas personalizadas', isDefault: true },
      { key: 'comments', name: 'Moderación de Comentarios', description: 'Sistema de debate seguro y anti-spam', isDefault: true },
      { key: 'newsletter', name: 'Suscripción & Boletines', description: 'Captación de lectores con doble opt-in', isDefault: false }
    ]
  },
  {
    id: 'app_blog_ads',
    key: 'BLOG_ADS',
    name: 'Fenix Blog & Ads Monetization',
    slug: 'blog-ads',
    description: 'Medio de comunicación digital con espacios publicitarios configurables, gestión de patrocinadores y banners.',
    status: 'ACTIVE',
    version: '1.4.0',
    icon: 'Megaphone',
    category: 'Monetización',
    modules: [
      { key: 'posts', name: 'Entradas & Artículos', description: 'Publicación editorial optimizada para tráfico masivo', isDefault: true },
      { key: 'ad_spaces', name: 'Espacios de Banners & Anuncios', description: 'Zonas publicitarias (Header, Sidebar, In-Content)', isDefault: true },
      { key: 'sponsors', name: 'Gestión de Patrocinadores', description: 'Directorio de marcas patrocinadoras y enlaces do-follow', isDefault: true },
      { key: 'ad_analytics', name: 'Métricas de Impresiones y Clics', description: 'Estadísticas de rendimiento de publicidad', isDefault: true }
    ]
  },
  {
    id: 'app_classifieds',
    key: 'CLASSIFIEDS',
    name: 'Fenix Classifieds Portal',
    slug: 'clasificados',
    description: 'Portal de anuncios clasificados estilo marketplace C2C/B2C con filtros por ubicación geográfica, chat y anuncios destacados.',
    status: 'ACTIVE',
    version: '1.8.0',
    icon: 'Tag',
    category: 'Marketplace',
    modules: [
      { key: 'ads', name: 'Gestión de Anuncios', description: 'Publicación de anuncios con galería de fotos y precio', isDefault: true },
      { key: 'locations', name: 'Filtros por Ciudad & Geografía', description: 'Búsqueda por proximidad y radio de distancia', isDefault: true },
      { key: 'moderation', name: 'Panel de Moderación', description: 'Aprobación de anuncios y prevención de fraudes', isDefault: true },
      { key: 'sellers', name: 'Perfiles de Vendedores', description: 'Reputación, valoraciones y badges de vendedor', isDefault: true },
      { key: 'premium_badges', name: 'Anuncios Destacados de Pago', description: 'Monetización por posicionamiento prioritario', isDefault: false }
    ]
  }
];

export async function main() {
  console.log('🌱 ========================================================');
  console.log('🌱 INICIANDO SEED INTEGRAL DE FENIX CMS EN POSTGRESQL');
  console.log('🌱 ========================================================\n');

  // 1. Applications & Modules
  console.log('📦 1. Sembrando Aplicaciones y Módulos...');
  for (const appData of SEED_APPLICATIONS) {
    const { modules, ...appFields } = appData;

    const upsertedApp = await prisma.application.upsert({
      where: { key: appFields.key },
      update: {
        name: appFields.name,
        slug: appFields.slug,
        description: appFields.description,
        status: appFields.status as any,
        version: appFields.version,
        icon: appFields.icon,
        category: appFields.category
      },
      create: {
        id: appFields.id,
        key: appFields.key,
        name: appFields.name,
        slug: appFields.slug,
        description: appFields.description,
        status: appFields.status as any,
        version: appFields.version,
        icon: appFields.icon,
        category: appFields.category
      }
    });

    for (const mod of modules) {
      await prisma.applicationModule.upsert({
        where: {
          applicationId_key: {
            applicationId: upsertedApp.id,
            key: mod.key
          }
        },
        update: {
          name: mod.name,
          description: mod.description,
          isDefault: mod.isDefault
        },
        create: {
          applicationId: upsertedApp.id,
          key: mod.key,
          name: mod.name,
          description: mod.description,
          isDefault: mod.isDefault
        }
      });
    }
  }

  // 2. Plans & Entitlements
  console.log('\n💳 2. Sembrando Planes SaaS y Límites...');
  const plans = [
    {
      id: 'plan_starter',
      applicationId: 'app_ecommerce',
      slug: 'starter',
      name: 'Plan Starter',
      description: 'Ideal para emprendedores y proyectos emergentes.',
      monthlyPrice: 19.00,
      yearlyPrice: 190.00,
      currency: 'EUR',
      status: 'ACTIVE',
      popular: false,
      trialDays: 14,
      features: ['100 productos', 'Soporte estándar', 'Dominio personalizado']
    },
    {
      id: 'plan_growth',
      applicationId: 'app_ecommerce',
      slug: 'growth',
      name: 'Plan Business Pro',
      description: 'Potencia total para empresas en expansión con catálogo ilimitado y addons.',
      monthlyPrice: 49.00,
      yearlyPrice: 490.00,
      currency: 'EUR',
      status: 'ACTIVE',
      popular: true,
      trialDays: 14,
      features: ['Productos ilimitados', 'Sin comisiones', 'Plugins & Addons', 'Multi-idioma']
    }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        currency: p.currency,
        status: p.status,
        popular: p.popular,
        trialDays: p.trialDays,
        features: p.features
      },
      create: {
        id: p.id,
        applicationId: p.applicationId,
        slug: p.slug,
        name: p.name,
        description: p.description,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        currency: p.currency,
        status: p.status,
        popular: p.popular,
        trialDays: p.trialDays,
        features: p.features
      }
    });
  }

  // 3. Sembrando Tenants A y B
  console.log('\n🏢 3. Sembrando Tenants A (Demo) y B (Milano Style)...');
  
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

  // 4. Domains para Tenant A y Tenant B
  console.log('\n🌐 4. Sembrando Dominios y Subdominios...');
  const domainsToSeed = [
    // Tenant A
    { id: 'dom_demo_sub', tenantId: tenantA.id, hostname: 'demo.fenixcms.es', type: 'SYSTEM_SUBDOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_demo_custom', tenantId: tenantA.id, hostname: 'tienda-demo.es', type: 'CUSTOM_DOMAIN', status: 'active', verified: true, isPrimary: true },
    { id: 'dom_cliente_sub', tenantId: tenantA.id, hostname: 'cliente.fenixcms.es', type: 'SYSTEM_SUBDOMAIN', status: 'active', verified: true, isPrimary: false },
    { id: 'dom_cliente_custom', tenantId: tenantA.id, hostname: 'cliente.com', type: 'CUSTOM_DOMAIN', status: 'active', verified: true, isPrimary: false },
    // Tenant B
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

  // 5. Categorías y Productos aislados
  console.log('\n🛍️ 5. Sembrando Productos de Tenant A (Tech) y Tenant B (Moda)...');
  
  // Categorías Tenant A
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

  // Productos Tenant A
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
      update: {
        ...prod,
        status: prod.status as any
      },
      create: {
        ...prod,
        status: prod.status as any
      }
    });
  }

  // Categorías Tenant B
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

  // Productos Tenant B (Moda Italiana)
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
      update: {
        ...prod,
        status: prod.status as any
      },
      create: {
        ...prod,
        status: prod.status as any
      }
    });
  }

  // 6. Páginas CMS para Tenant A y Tenant B
  console.log('\n📄 6. Sembrando Páginas CMS...');
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

  // 7. Blog Posts para Tenant A y Tenant B
  console.log('\n✍️ 7. Sembrando Artículos de Blog...');
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
      excerpt: 'Le novità imperdibili presentate durante la settimana della moda milanese.'
    }
  });

  // 8. Themes & ThemeInstallations (Phase 20-D.5)
  console.log('\n🎨 8. Sembrando Temas y Asignaciones...');
  const seedThemes = [
    {
      id: 'theme_fenix_market',
      key: 'theme_fenix_market',
      name: 'Fenix Market Pro (Amazon Style)',
      slug: 'fenix-market-pro',
      description: 'Tema de alta conversión inspirado en marketplaces globales con megamenú, carruseles dinámicos y checkout rápido.',
      version: '1.2.0',
      author: 'Fenix Studio',
      palette: {
        primary: '#131921',
        secondary: '#232f3e',
        background: '#f3f4f6',
        surface: '#ffffff',
        accent: '#febd69',
        text: '#0f172a'
      },
      typography: {
        headingFont: 'Plus Jakarta Sans, sans-serif',
        bodyFont: 'Inter, sans-serif'
      },
      layout: {
        previewImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80'
      },
      sections: [
        { id: 'sec_hero_1', type: 'hero_banner', name: 'Hero Banner Principal', isEnabled: true, order: 0, settings: {} },
        { id: 'sec_feat_1', type: 'featured_products', name: 'Productos Destacados', isEnabled: true, order: 1, settings: {} },
        { id: 'sec_cat_1', type: 'category_grid', name: 'Categorías Destacadas', isEnabled: true, order: 2, settings: {} }
      ]
    },
    {
      id: 'theme_modern_luxe',
      key: 'theme_modern_luxe',
      name: 'Modern Luxe (Minimal Boutique)',
      slug: 'modern-luxe',
      description: 'Estética minimalista con tipografías elegantes, fondos limpios y enfoque en fotografía de producto de alta gama.',
      version: '1.1.0',
      author: 'Milano Design Team',
      palette: {
        primary: '#09090b',
        secondary: '#27272a',
        background: '#ffffff',
        surface: '#fafafa',
        accent: '#d97706',
        text: '#18181b'
      },
      typography: {
        headingFont: 'Playfair Display, serif',
        bodyFont: 'Plus Jakarta Sans, sans-serif'
      },
      layout: {
        previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80'
      },
      sections: [
        { id: 'sec_hero_2', type: 'hero_banner', name: 'Editorial Lookbook Banner', isEnabled: true, order: 0, settings: {} },
        { id: 'sec_feat_2', type: 'featured_products', name: 'Colección Milano', isEnabled: true, order: 1, settings: {} }
      ]
    }
  ];

  for (const th of seedThemes) {
    await prisma.theme.upsert({
      where: { id: th.id },
      update: {
        name: th.name,
        slug: th.slug,
        description: th.description,
        version: th.version,
        author: th.author,
        palette: th.palette,
        typography: th.typography,
        layout: th.layout,
        sections: th.sections,
        isActive: true
      },
      create: {
        id: th.id,
        tenantId: tenantA.id,
        key: th.key,
        name: th.name,
        slug: th.slug,
        description: th.description,
        version: th.version,
        author: th.author,
        palette: th.palette,
        typography: th.typography,
        layout: th.layout,
        sections: th.sections,
        isActive: true
      }
    });
  }

  // Activar tema en Tenant A y Tenant B
  await prisma.themeInstallation.upsert({
    where: { tenantId_themeId: { tenantId: tenantA.id, themeId: 'theme_fenix_market' } },
    update: { isActive: true },
    create: { tenantId: tenantA.id, themeId: 'theme_fenix_market', isActive: true }
  });

  await prisma.themeInstallation.upsert({
    where: { tenantId_themeId: { tenantId: tenantB.id, themeId: 'theme_modern_luxe' } },
    update: { isActive: true },
    create: { tenantId: tenantB.id, themeId: 'theme_modern_luxe', isActive: true }
  });

  // 9. Plugins & PluginInstallations (Phase 20-D.5)
  console.log('\n🔌 9. Sembrando Plugins y Extensiones...');
  const seedPlugins = [
    {
      id: 'plg_seo_pro',
      key: 'seo_pro',
      name: 'Fenix SEO & Meta Master',
      version: '2.1.0',
      category: 'seo',
      isEnabled: true,
      config: { autoGenerateMeta: true, canonicalEnforce: true },
      manifest: {
        author: 'Fenix Core Team',
        description: 'Optimización automatizada de meta-tags, OpenGraph, Twitter Cards y Sitemap XML dinámico.',
        applicationScope: 'ALL',
        minCmsVersion: '2.0.0',
        hooks: ['head.meta', 'sitemap.generate'],
        permissions: ['read_catalog', 'write_seo']
      }
    },
    {
      id: 'plg_import_pro',
      key: 'fenix_all_import_pro',
      name: 'Fenix All Import Pro (CSV / XML / API)',
      version: '3.0.0',
      category: 'tools',
      isEnabled: true,
      config: { batchSize: 50, updateStockOnly: false },
      manifest: {
        author: 'Fenix Integrations',
        description: 'Motor de sincronización masiva de inventarios, precios y catálogos de proveedores externos.',
        applicationScope: 'ECOMMERCE',
        minCmsVersion: '2.0.0',
        hooks: ['catalog.import', 'inventory.sync'],
        permissions: ['write_catalog', 'write_inventory']
      }
    }
  ];

  for (const plg of seedPlugins) {
    await prisma.plugin.upsert({
      where: { id: plg.id },
      update: {
        name: plg.name,
        version: plg.version,
        category: plg.category,
        isEnabled: plg.isEnabled,
        config: plg.config,
        manifest: plg.manifest
      },
      create: {
        id: plg.id,
        tenantId: tenantA.id,
        key: plg.key,
        name: plg.name,
        version: plg.version,
        category: plg.category,
        isEnabled: plg.isEnabled,
        config: plg.config,
        manifest: plg.manifest
      }
    });
  }

  // Activar plugins en Tenant A
  await prisma.pluginInstallation.upsert({
    where: { tenantId_pluginId: { tenantId: tenantA.id, pluginId: 'plg_seo_pro' } },
    update: { isEnabled: true, settings: { autoGenerateMeta: true } },
    create: { tenantId: tenantA.id, pluginId: 'plg_seo_pro', isEnabled: true, settings: { autoGenerateMeta: true } }
  });

  // 10. MediaAssets (Phase 20-D.5)
  console.log('\n🖼️ 10. Sembrando Activos Multimedia...');
  const seedMedia = [
    {
      id: 'media_a_logo',
      tenantId: tenantA.id,
      filename: 'fenix-market-logo.png',
      path: 'fenix-market-logo.png',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
      mimeType: 'image/png',
      size: 45200,
      width: 400,
      height: 120,
      alt: 'Fenix Market Logo',
      storageProvider: 'managed_local',
      isPublic: true
    },
    {
      id: 'media_b_banner',
      tenantId: tenantB.id,
      filename: 'milano-boutique-lookbook.webp',
      path: 'milano-boutique-lookbook.webp',
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
      mimeType: 'image/webp',
      size: 185400,
      width: 1200,
      height: 600,
      alt: 'Milano Boutique Lookbook Banner',
      storageProvider: 'managed_local',
      isPublic: true
    }
  ];

  for (const m of seedMedia) {
    await prisma.mediaAsset.upsert({
      where: { id: m.id },
      update: m,
      create: m
    });
  }

  console.log('\n========================================================');
  console.log('✨ SEED DE POSTGRESQL FINALIZADO EXITOSAMENTE');
  console.log('✨ Tenants, Dominios, Catálogo, Themes, Plugins y Media configurados');
  console.log('========================================================\n');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Error ejecutando seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
