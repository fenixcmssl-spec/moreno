import { PrismaClient, UserRole } from '@prisma/client';

export const MASTER_APPLICATIONS = [
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

export const MASTER_PLANS = [
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
    features: ['100 productos', 'Soporte estándar', 'Dominio personalizado'],
    entitlements: [
      { key: 'products.max', value: '100', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '1000', type: 'NUMBER' },
      { key: 'domains.max', value: '1', type: 'NUMBER' },
      { key: 'users.max', value: '2', type: 'NUMBER' },
      { key: 'ai.enabled', value: 'false', type: 'BOOLEAN' },
      { key: 'plugins.enabled', value: 'false', type: 'BOOLEAN' },
      { key: 'customDomain.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customTheme.enabled', value: 'false', type: 'BOOLEAN' },
      { key: 'multilingual.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'export.enabled', value: 'false', type: 'BOOLEAN' }
    ]
  },
  {
    id: 'plan_growth',
    applicationId: 'app_ecommerce',
    slug: 'growth',
    name: 'Plan Business Pro',
    description: 'Potencia total para empresas en expansión con catálogo ampliado, IA y addons.',
    monthlyPrice: 49.00,
    yearlyPrice: 490.00,
    currency: 'EUR',
    status: 'ACTIVE',
    popular: true,
    trialDays: 14,
    features: ['Catálogo hasta 1,000 productos', 'Plugins & Addons', 'Asistente IA Gemini', 'Multi-idioma'],
    entitlements: [
      { key: 'products.max', value: '1000', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '5000', type: 'NUMBER' },
      { key: 'domains.max', value: '2', type: 'NUMBER' },
      { key: 'users.max', value: '3', type: 'NUMBER' },
      { key: 'ai.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'plugins.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customDomain.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customTheme.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'multilingual.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'export.enabled', value: 'true', type: 'BOOLEAN' }
    ]
  },
  {
    id: 'plan_pro',
    applicationId: 'app_ecommerce',
    slug: 'pro-store',
    name: 'Professional Store',
    description: 'Para tiendas consolidadas con catálogo medio y automatizaciones.',
    monthlyPrice: 79.00,
    yearlyPrice: 790.00,
    currency: 'EUR',
    status: 'ACTIVE',
    popular: false,
    trialDays: 14,
    features: ['2,500 productos', 'Todas las pasarelas', 'Tracking automático', 'Soporte 24/7'],
    entitlements: [
      { key: 'products.max', value: '2500', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '10000', type: 'NUMBER' },
      { key: 'domains.max', value: '3', type: 'NUMBER' },
      { key: 'users.max', value: '5', type: 'NUMBER' },
      { key: 'ai.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'plugins.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customDomain.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customTheme.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'multilingual.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'export.enabled', value: 'true', type: 'BOOLEAN' }
    ]
  },
  {
    id: 'plan_enterprise',
    applicationId: 'app_ecommerce',
    slug: 'enterprise-network',
    name: 'Enterprise Network',
    description: 'Máxima potencia para grandes marcas y redes multi-tienda.',
    monthlyPrice: 199.00,
    yearlyPrice: 1990.00,
    currency: 'EUR',
    status: 'ACTIVE',
    popular: false,
    trialDays: 30,
    features: ['50,000 productos', 'API REST pública', 'Webhooks salientes', 'SLA 99.99%'],
    entitlements: [
      { key: 'products.max', value: '50000', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '100000', type: 'NUMBER' },
      { key: 'domains.max', value: '10', type: 'NUMBER' },
      { key: 'users.max', value: '25', type: 'NUMBER' },
      { key: 'ai.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'plugins.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customDomain.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'customTheme.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'multilingual.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'export.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'api.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'webhooks.enabled', value: 'true', type: 'BOOLEAN' }
    ]
  },
  {
    id: 'plan_blog_starter',
    applicationId: 'app_blog',
    slug: 'blog-creator',
    name: 'Blog Creator',
    description: 'Sistema editorial para redactores y publicaciones digitales.',
    monthlyPrice: 19.00,
    yearlyPrice: 190.00,
    currency: 'EUR',
    status: 'ACTIVE',
    popular: false,
    trialDays: 14,
    features: ['Artículos ilimitados', 'SEO automatizado', 'Gestión de autores'],
    entitlements: [
      { key: 'blog.posts_max', value: '500', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '5000', type: 'NUMBER' },
      { key: 'domains.max', value: '1', type: 'NUMBER' },
      { key: 'users.max', value: '3', type: 'NUMBER' },
      { key: 'seo.enabled', value: 'true', type: 'BOOLEAN' },
      { key: 'blog.enabled', value: 'true', type: 'BOOLEAN' }
    ]
  },
  {
    id: 'plan_classifieds_pro',
    applicationId: 'app_classifieds',
    slug: 'clasificados-pro',
    name: 'Portal Clasificados Pro',
    description: 'Marketplace de anuncios con geolocalización y destacados.',
    monthlyPrice: 49.00,
    yearlyPrice: 490.00,
    currency: 'EUR',
    status: 'ACTIVE',
    popular: false,
    trialDays: 14,
    features: ['Anuncios clasificados', 'Filtros de proximidad', 'Mensajería directa'],
    entitlements: [
      { key: 'classifieds.ads_max', value: '5000', type: 'NUMBER' },
      { key: 'storage.max_mb', value: '20000', type: 'NUMBER' },
      { key: 'domains.max', value: '2', type: 'NUMBER' },
      { key: 'users.max', value: '10', type: 'NUMBER' },
      { key: 'ads.enabled', value: 'true', type: 'BOOLEAN' }
    ]
  }
];

export const MASTER_ROLES: { name: UserRole; description: string; permissions: { action: string; resource: string }[] }[] = [
  {
    name: 'SUPER_ADMIN',
    description: 'Super Administrador global de la plataforma SaaS FenixCMS con acceso total',
    permissions: [
      { action: '*', resource: '*' }
    ]
  },
  {
    name: 'OWNER',
    description: 'Propietario del Tenant con control total de facturación, licencias, equipo y catálogo',
    permissions: [
      { action: 'read', resource: 'tenant' },
      { action: 'update', resource: 'tenant' },
      { action: 'manage', resource: 'billing' },
      { action: 'manage', resource: 'catalog' },
      { action: 'manage', resource: 'orders' },
      { action: 'manage', resource: 'users' },
      { action: 'manage', resource: 'plugins' },
      { action: 'manage', resource: 'themes' }
    ]
  },
  {
    name: 'ADMIN',
    description: 'Administrador del Tenant con permisos operativos completos excepto traspaso de propiedad',
    permissions: [
      { action: 'read', resource: 'tenant' },
      { action: 'manage', resource: 'catalog' },
      { action: 'manage', resource: 'orders' },
      { action: 'manage', resource: 'users' },
      { action: 'manage', resource: 'plugins' },
      { action: 'manage', resource: 'themes' }
    ]
  },
  {
    name: 'MANAGER',
    description: 'Gestor de tienda: administración de pedidos, inventario, clientes y cupones',
    permissions: [
      { action: 'read', resource: 'catalog' },
      { action: 'update', resource: 'catalog' },
      { action: 'manage', resource: 'orders' },
      { action: 'read', resource: 'customers' }
    ]
  },
  {
    name: 'EDITOR',
    description: 'Editor de contenidos: blog, páginas, productos y menús sin acceso a configuración sensible',
    permissions: [
      { action: 'manage', resource: 'content' },
      { action: 'read', resource: 'catalog' },
      { action: 'update', resource: 'catalog' }
    ]
  },
  {
    name: 'STAFF',
    description: 'Personal de atención al cliente y empaquetado de pedidos',
    permissions: [
      { action: 'read', resource: 'orders' },
      { action: 'update', resource: 'orders:fulfillment' }
    ]
  },
  {
    name: 'CUSTOMER',
    description: 'Cliente final registrado en la tienda del Tenant',
    permissions: [
      { action: 'read', resource: 'profile' },
      { action: 'read', resource: 'my_orders' }
    ]
  }
];

export const MASTER_PLATFORM_SETTINGS = [
  {
    key: 'platform_security',
    value: {
      passwordMinLength: 8,
      sessionTtlHours: 72,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      enforceHttpsInProduction: true,
      allowedOrigins: ['https://*.fenixcms.es', 'http://localhost:3000']
    }
  },
  {
    key: 'platform_localization',
    value: {
      defaultLocale: 'es',
      supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
      defaultCurrency: 'EUR',
      supportedCurrencies: ['EUR', 'USD', 'GBP']
    }
  },
  {
    key: 'platform_saas_defaults',
    value: {
      trialDaysDefault: 14,
      gracePeriodDays: 3,
      defaultTheme: 'theme_modern_luxe',
      defaultApplication: 'ECOMMERCE'
    }
  }
];

export async function seedMasterData(prisma: PrismaClient) {
  console.log('📦 [MASTER DATA] 1. Sembrando Aplicaciones y Módulos Maestros...');
  for (const appData of MASTER_APPLICATIONS) {
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

  console.log('💳 [MASTER DATA] 2. Sembrando Planes SaaS y Matriz de Entitlements...');
  for (const p of MASTER_PLANS) {
    const { entitlements, ...planFields } = p;
    const upsertedPlan = await prisma.plan.upsert({
      where: { slug: planFields.slug },
      update: {
        name: planFields.name,
        description: planFields.description,
        monthlyPrice: planFields.monthlyPrice,
        yearlyPrice: planFields.yearlyPrice,
        currency: planFields.currency,
        status: planFields.status,
        popular: planFields.popular,
        trialDays: planFields.trialDays,
        features: planFields.features
      },
      create: {
        id: planFields.id,
        applicationId: planFields.applicationId,
        slug: planFields.slug,
        name: planFields.name,
        description: planFields.description,
        monthlyPrice: planFields.monthlyPrice,
        yearlyPrice: planFields.yearlyPrice,
        currency: planFields.currency,
        status: planFields.status,
        popular: planFields.popular,
        trialDays: planFields.trialDays,
        features: planFields.features
      }
    });

    await prisma.planEntitlement.deleteMany({
      where: { planId: upsertedPlan.id }
    });

    if (entitlements && entitlements.length > 0) {
      await prisma.planEntitlement.createMany({
        data: entitlements.map((e) => ({
          planId: upsertedPlan.id,
          key: e.key,
          value: e.value,
          type: e.type as any
        }))
      });
    }
  }

  console.log('🛡️ [MASTER DATA] 3. Sembrando Roles y Permisos del Sistema...');
  for (const r of MASTER_ROLES) {
    const upsertedRole = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        description: r.description,
        isSystem: true
      },
      create: {
        name: r.name,
        description: r.description,
        isSystem: true
      }
    });

    await prisma.permission.deleteMany({
      where: { roleId: upsertedRole.id }
    });

    for (const perm of r.permissions) {
      await prisma.permission.create({
        data: {
          roleId: upsertedRole.id,
          action: perm.action,
          resource: perm.resource
        }
      });
    }
  }

  console.log('⚙️ [MASTER DATA] 4. Sembrando Configuraciones Globales de Plataforma...');
  for (const setting of MASTER_PLATFORM_SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value }
    });
  }

  console.log('✅ [MASTER DATA] Datos maestros sembrados con éxito.');
}
