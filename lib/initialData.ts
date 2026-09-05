import { SaaSPlan, SaaSLicense, TenantStore, ProductItem, StoreOrder, PluginDefinition, ThemeDefinition, MarketplaceItem } from '@/types';

export const INITIAL_PLANS: SaaSPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter Merchant',
    badge: 'Para Emprendedores',
    priceMonthly: 29,
    priceYearly: 290,
    description: 'Ideal para lanzar tu primera tienda online con todas las funciones esenciales.',
    maxProducts: 100,
    maxStorageMb: 1000,
    customDomainAllowed: true,
    features: [
      'Hasta 100 productos activos',
      'Pasarelas: PayPal, Stripe y Transferencia',
      'Plugin de Envíos Correos Express',
      'Importador Fenix All Import Pro (Hasta 500 registros/mes)',
      'Soporte multi-idioma (6 idiomas)',
      'Subdominio o Dominio propio SSL',
      'Soporte estándar por email'
    ]
  },
  {
    id: 'plan_pro',
    name: 'Professional Store',
    badge: 'Más Popular',
    popular: true,
    priceMonthly: 79,
    priceYearly: 790,
    description: 'Para negocios en crecimiento que requieren catálogo ilimitado y automatizaciones.',
    maxProducts: 2500,
    maxStorageMb: 10000,
    customDomainAllowed: true,
    features: [
      'Hasta 2,500 productos y variantes',
      'Todas las pasarelas (+ Contrarrembolso)',
      'Plugin de Envíos Correos con Tracking automático',
      'Importador Fenix All Import Pro Ilimitado (CSV/XML/JSON)',
      'Editor visual de Temas y CSS personalizado',
      'Asistente de IA Gemini para fichas y SEO',
      'Recuperación de Carritos Abandonados',
      'Soporte prioritario 24/7'
    ]
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise Network',
    badge: 'Máxima Potencia',
    priceMonthly: 199,
    priceYearly: 1990,
    description: 'Para grandes catálogos, marcas consolidadas y agencias multi-tienda.',
    maxProducts: 50000,
    maxStorageMb: 100000,
    customDomainAllowed: true,
    features: [
      'Productos y almacenamiento ilimitados',
      'Instalación ilimitada de Plugins y Temas',
      'API REST pública para ERP/CRMs externos',
      'Base de datos dedicada aislada',
      'SLA garantizado 99.99%',
      'Account Manager y soporte telefónico dedicado'
    ]
  }
];

export const INITIAL_LICENSES: SaaSLicense[] = [
  {
    id: 'lic_882910',
    licenseKey: 'FNX-PRO-9823-X981-DEMO',
    planId: 'plan_pro',
    planName: 'Professional Store',
    status: 'active',
    customerName: 'Administrador FenixCMS',
    customerEmail: 'info@fenixcms.es',
    tenantSlug: 'tienda-demo',
    tenantName: 'Mi Tienda Online',
    price: 79,
    billingPeriod: 'monthly',
    paymentProvider: 'paypal',
    transactionId: 'PP-TX-9938172635',
    validFrom: '2026-09-01T00:00:00Z',
    validTo: '2027-09-01T00:00:00Z',
    maxProducts: 2500,
    maxStorageMb: 10000,
    createdAt: '2026-09-01T10:30:00Z'
  },
  {
    id: 'lic_771239',
    licenseKey: 'FNX-STA-4412-K872-BOUTIQUE',
    planId: 'plan_starter',
    planName: 'Starter Merchant',
    status: 'active',
    customerName: 'Elena Rossi',
    customerEmail: 'elena@milano-style.it',
    tenantSlug: 'milanostyle',
    tenantName: 'Milano Style Store',
    price: 29,
    billingPeriod: 'monthly',
    paymentProvider: 'paypal',
    transactionId: 'PP-TX-1029384756',
    validFrom: '2026-08-15T00:00:00Z',
    validTo: '2027-08-15T00:00:00Z',
    maxProducts: 100,
    maxStorageMb: 1000,
    createdAt: '2026-08-15T09:00:00Z'
  }
];

export const INITIAL_TENANT: TenantStore = {
  id: 'tenant_demo',
  name: 'Mi Tienda Online',
  slug: 'tienda-demo',
  domain: 'demo.fenixcms.es',
  customDomain: 'tutienda.com',
  status: 'active',
  planId: 'plan_pro',
  licenseKey: 'FNX-PRO-9823-X981-DEMO',
  ownerEmail: 'info@fenixcms.es',
  ownerName: 'Administrador FenixCMS',
  themeId: 'theme_fenix_market',
  currency: 'EUR',
  defaultLocale: 'es',
  supportedLocales: ['es', 'it', 'en', 'fr', 'de', 'pt'],
  settings: {
    storeName: 'Mi Tienda Online',
    tagline: 'Todo lo que buscas, al mejor precio y con entrega rápida',
    supportEmail: 'info@fenixcms.es',
    phone: '+34 912 345 678',
    address: 'Calle Comercio 1, 28001 Madrid, España',
    taxRate: 21,
    shippingBaseCost: 3.99,
    freeShippingThreshold: 29.00
  },
  activePlugins: [
    'plugin_paypal',
    'plugin_stripe',
    'plugin_bank_transfer',
    'plugin_cash_on_delivery',
    'plugin_correos',
    'plugin_fenix_import',
    'plugin_ai_gemini',
    'plugin_abandoned_cart'
  ],
  createdAt: '2026-09-01T10:30:00Z'
};

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod_1',
    tenantId: 'tenant_demo',
    title: 'Auriculares Inalámbricos Noise Cancelling Pro ANC',
    slug: 'auriculares-inalambricos-noise-cancelling-pro-anc',
    description: 'Auriculares inalámbricos con cancelación activa de ruido híbrida de 40dB, sonido Hi-Res Audio, batería de 65 horas y micrófonos con IA para llamadas cristalinas.',
    category: 'Electrónica',
    price: 49.99,
    compareAtPrice: 89.99,
    costPrice: 22.00,
    sku: 'AUR-ANC-PRO-BLK',
    barcode: '8437019283012',
    stock: 84,
    rating: 4.8,
    reviewsCount: 1420,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80'
    ],
    isFeatured: true,
    isBestSeller: true,
    isDeal: true,
    dealDiscountPercent: 44,
    tags: ['auriculares', 'bluetooth', 'anc', 'audio', 'oferta'],
    attributes: {
      brand: 'SoundPulse',
      color: 'Negro Mate',
      weight: '250g',
      warranty: '3 años'
    },
    translations: {
      es: {
        title: 'Auriculares Inalámbricos Noise Cancelling Pro ANC',
        description: 'Auriculares inalámbricos con cancelación activa de ruido híbrida de 40dB, sonido Hi-Res Audio, batería de 65 horas y micrófonos con IA para llamadas cristalinas.'
      },
      en: {
        title: 'Wireless Active Noise Cancelling Over-Ear Headphones Pro',
        description: 'Premium wireless headphones with 40dB hybrid active noise cancellation, Hi-Res certified sound, 65-hour battery life, and AI-powered crystal-clear microphones.'
      },
      it: {
        title: 'Cuffie Wireless con Cancellazione Attiva del Rumore Pro ANC',
        description: 'Cuffie wireless con cancellazione attiva del rumore ibrida da 40dB, audio Hi-Res, autonomia di 65 ore e microfoni con intelligenza artificiale per chiamate cristalline.'
      },
      fr: {
        title: 'Casque Sans Fil à Réduction de Bruit Active Pro ANC',
        description: 'Casque sans fil avec réduction active du bruit hybride de 40 dB, son Hi-Res Audio, autonomie exceptionnelle de 65 heures et micros IA pour des appels haute clarté.'
      },
      de: {
        title: 'Kabellose Over-Ear-Kopfhörer mit Noise Cancelling Pro ANC',
        description: 'Kabellose Premium-Kopfhörer mit 40dB hybrider aktiver Geräuschunterdrückung, Hi-Res-Audioqualität, 65 Stunden Akkulaufzeit und KI-Mikrofonen für klare Telefonate.'
      },
      pt: {
        title: 'Auscultadores Sem Fios com Cancelamento de Ruído Pro ANC',
        description: 'Auscultadores sem fios com cancelamento de ruído ativo híbrido de 40dB, áudio Hi-Res, bateria de 65 horas e microfones com IA para chamadas de alta nitidez.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T11:00:00Z'
  },
  {
    id: 'prod_2',
    tenantId: 'tenant_demo',
    title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
    slug: 'smartwatch-fitness-tracker-ultra-amoled-gps',
    description: 'Reloj inteligente con pantalla AMOLED de alta resolución, GPS integrado, sensor SpO2, monitor de frecuencia cardíaca 24/7 y más de 120 modos deportivos.',
    category: 'Electrónica',
    price: 64.50,
    compareAtPrice: 99.00,
    costPrice: 28.00,
    sku: 'SMW-ULTRA-GPS-SLV',
    barcode: '8437019283029',
    stock: 45,
    rating: 4.7,
    reviewsCount: 930,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
    ],
    isFeatured: true,
    isBestSeller: true,
    isDeal: true,
    dealDiscountPercent: 35,
    tags: ['smartwatch', 'reloj', 'fitness', 'gps'],
    attributes: {
      brand: 'ChronosTech',
      color: 'Plata Titanio',
      warranty: '2 años'
    },
    translations: {
      es: {
        title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
        description: 'Reloj inteligente con pantalla AMOLED de alta resolución, GPS integrado, sensor SpO2, monitor de frecuencia cardíaca 24/7 y más de 120 modos deportivos.'
      },
      it: {
        title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
        description: 'Orologio intelligente con display AMOLED ad alta risoluzione, GPS integrato, sensore SpO2, cardiofrequenzimetro 24/7 e oltre 120 modalità sportive.'
      },
      en: {
        title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
        description: 'Smartwatch featuring high-res AMOLED display, built-in GPS, SpO2 blood oxygen sensor, 24/7 heart rate monitor, and 120+ sport modes.'
      },
      fr: {
        title: 'Montre Connectée Fitness Tracker Ultra AMOLED 1.95" GPS',
        description: 'Montre intelligente avec écran AMOLED haute résolution, GPS intégré, capteur SpO2, suivi cardiaque 24/7 et plus de 120 modes sportifs.'
      },
      de: {
        title: 'Smartwatch Fitness-Tracker Ultra AMOLED 1,95" GPS',
        description: 'Smartwatch mit hochauflösendem AMOLED-Display, integriertem GPS, SpO2-Blutsauerstoffsensor, 24/7-Herzfrequenzmessung und über 120 Sportmodi.'
      },
      pt: {
        title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
        description: 'Relógio inteligente com ecrã AMOLED de alta definição, GPS integrado, sensor SpO2, monitor de ritmo cardíaco 24/7 e mais de 120 modos desportivos.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T11:30:00Z'
  },
  {
    id: 'prod_3',
    tenantId: 'tenant_demo',
    title: 'Cafetera Espresso Automática 20 Bares con Vaporizador',
    slug: 'cafetera-espresso-automatica-20-bares',
    description: 'Cafetera de espresso y cappuccino con bomba italiana de 20 bares, depósito de agua de 1.5L extraíble, calentador de tazas y acabado en acero inoxidable cepillado.',
    category: 'Hogar y Cocina',
    price: 89.95,
    compareAtPrice: 139.99,
    costPrice: 42.00,
    sku: 'HOG-CAF-ESP-20B',
    stock: 29,
    rating: 4.9,
    reviewsCount: 654,
    images: [
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
    ],
    isFeatured: true,
    isDeal: true,
    dealDiscountPercent: 36,
    tags: ['cafetera', 'cafe', 'espresso', 'hogar'],
    attributes: {
      brand: 'BaristaPro',
      color: 'Acero Inox',
      warranty: '3 años'
    },
    translations: {
      es: {
        title: 'Cafetera Espresso Automática 20 Bares con Vaporizador',
        description: 'Cafetera de espresso y cappuccino con bomba italiana de 20 bares, depósito de agua de 1.5L extraíble, calentador de tazas y acabado en acero inoxidable cepillado.'
      },
      it: {
        title: 'Macchina da Caffè Espresso Automatica 20 Bar con Montalatte',
        description: 'Macchina per espresso e cappuccino con pompa italiana a 20 bar, serbatoio da 1.5L rimovibile, scaldatazze e finitura in acciaio inossidabile satinato.'
      },
      en: {
        title: 'Automatic Espresso & Cappuccino Maker 20-Bar with Milk Frother',
        description: 'Espresso machine with 20-bar Italian pump, 1.5L removable water tank, heated cup warmer plate, and brushed stainless steel finish.'
      },
      fr: {
        title: 'Machine à Café Espresso Automatique 20 Bars avec Buse Vapeur',
        description: 'Machine à café espresso et cappuccino avec pompe italienne 20 bars, réservoir d\'eau 1.5L amovible, chauffe-tasses et finition inox brossé.'
      },
      de: {
        title: 'Automatische Espresso-Kaffeemaschine 20 Bar mit Milchaufschäumer',
        description: 'Espresso- und Cappuccinomaschine mit 20-Bar-Italienpumpe, abnehmbarem 1,5L-Wassertank, Tassenwärmer und gebürstetem Edelstahl-Design.'
      },
      pt: {
        title: 'Máquina de Café Espresso Automática 20 Bares com Vaporizador',
        description: 'Máquina de café espresso e cappuccino com bomba italiana de 20 bares, depósito de 1.5L removível, aquecedor de chávenas e acabamento em aço inoxidável.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T12:00:00Z'
  },
  {
    id: 'prod_4',
    tenantId: 'tenant_demo',
    title: 'Teclado Mecánico RGB Gaming Inalámbrico 75% Hot-Swap',
    slug: 'teclado-mecanico-rgb-gaming-inalambrico-75',
    description: 'Teclado mecánico compacto con switches táctiles intercambiables en caliente, iluminación RGB programable por tecla, conexión Bluetooth 5.2 / 2.4Ghz y USB-C.',
    category: 'Informática',
    price: 59.90,
    compareAtPrice: 79.99,
    costPrice: 26.00,
    sku: 'INF-TEC-MEC-75RGB',
    stock: 62,
    rating: 4.6,
    reviewsCount: 380,
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'
    ],
    isFeatured: false,
    tags: ['teclado', 'gaming', 'rgb', 'mecanico'],
    attributes: {
      brand: 'ViperKeys',
      color: 'Gris Grafito',
      warranty: '2 años'
    },
    translations: {
      es: {
        title: 'Teclado Mecánico RGB Gaming Inalámbrico 75% Hot-Swap',
        description: 'Teclado mecánico compacto con switches táctiles intercambiables en caliente, iluminación RGB programable por tecla, conexión Bluetooth 5.2 / 2.4Ghz y USB-C.'
      },
      it: {
        title: 'Tastiera Meccanica RGB Gaming Wireless 75% Hot-Swap',
        description: 'Tastiera meccanica compatta con switch tattili sostituibili a caldo, illuminazione RGB programmabile, tripla connessione Bluetooth 5.2, 2.4GHz e USB-C.'
      },
      en: {
        title: 'Wireless 75% Hot-Swappable Mechanical Gaming Keyboard RGB',
        description: 'Compact mechanical keyboard with hot-swappable tactile switches, per-key programmable RGB lighting, triple connectivity (Bluetooth 5.2 / 2.4GHz / Type-C).'
      },
      fr: {
        title: 'Clavier Mécanique Gamer Sans Fil 75% Hot-Swap RGB',
        description: 'Clavier mécanique compact avec switches tactiles interchangeables à chaud, rétroéclairage RGB personnalisable, triple connexion Bluetooth / 2.4GHz / USB-C.'
      },
      de: {
        title: 'Kabellose Mechanische 75% Gaming-Tastatur RGB Hot-Swap',
        description: 'Kompakte mechanische Tastatur mit Hot-Swap-Switches, programmierbarer Einzeltasten-RGB-Beleuchtung, Bluetooth 5.2 / 2.4GHz Funk und USB-C.'
      },
      pt: {
        title: 'Teclado Mecânico RGB Gaming Sem Fios 75% Hot-Swap',
        description: 'Teclado mecânico compacto com switches táteis hot-swap, iluminação RGB tecla a tecla, ligação Bluetooth 5.2 / 2.4Ghz e cabo USB-C.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T12:30:00Z'
  },
  {
    id: 'prod_5',
    tenantId: 'tenant_demo',
    title: 'Mochila Impermeable para Portátil 15.6" con Puerto USB',
    slug: 'mochila-impermeable-portatil-antirrobo',
    description: 'Mochila ergonómica de viaje y trabajo con compartimento acolchado para laptop, bolsillos antirrobo ocultos, tejido hidrófugo y conector USB de carga externa.',
    category: 'Moda y Ropa',
    price: 32.99,
    compareAtPrice: 49.99,
    costPrice: 12.50,
    sku: 'MOD-MOC-ANT-BLK',
    stock: 110,
    rating: 4.8,
    reviewsCount: 1890,
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'
    ],
    isFeatured: true,
    isBestSeller: true,
    tags: ['mochila', 'portatil', 'viaje', 'antirrobo'],
    attributes: {
      brand: 'NordicPack',
      color: 'Negro Carbón',
      warranty: '2 años'
    },
    translations: {
      es: {
        title: 'Mochila Impermeable para Portátil 15.6" con Puerto USB',
        description: 'Mochila ergonómica de viaje y trabajo con compartimento acolchado para laptop, bolsillos antirrobo ocultos, tejido hidrófugo y conector USB de carga externa.'
      },
      it: {
        title: 'Zaino Impermeabile per Computer Portatile 15.6" con Porta USB',
        description: 'Zaino ergonomico da viaggio e lavoro con scomparto imbottito per laptop, tasche antifurto nascoste, tessuto idrorepellente e porta di ricarica USB esterna.'
      },
      en: {
        title: 'Waterproof Anti-Theft 15.6" Laptop Backpack with USB Charging Port',
        description: 'Ergonomic business and travel backpack with padded laptop sleeve, hidden anti-theft security pockets, water-resistant fabric, and external USB charging port.'
      },
      fr: {
        title: 'Sac à Dos Imperméable pour Ordinateur Portable 15.6" avec Port USB',
        description: 'Sac à dos ergonomique pour voyage et travail avec compartiment rembourré pour PC portable, poches antivol cachées, tissu déperlant et port de charge USB.'
      },
      de: {
        title: 'Wasserdichter 15,6" Laptop-Rucksack mit Diebstahlschutz & USB',
        description: 'Ergonomischer Business- und Reiserucksack mit gepolstertem Laptopfach, verdeckten Anti-Diebstahl-Taschen, wasserabweisendem Stoff und externem USB-Port.'
      },
      pt: {
        title: 'Mochila Impermeável para Portátil 15.6" com Porta USB',
        description: 'Mochila ergonómica para viagem e trabalho com compartimento almofadado para portátil, bolsos antifurto ocultos, tecido repelente de água e porta USB.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T13:00:00Z'
  },
  {
    id: 'prod_6',
    tenantId: 'tenant_demo',
    title: 'Freidora de Aire Digital XL 6.5L con Ventana Visor',
    slug: 'freidora-de-aire-digital-xl-6-5l',
    description: 'Freidora sin aceite con potencia de 1800W, panel táctil con 10 programas preconfigurados, circulación de aire 360° y cesta antiadherente apta para lavavajillas.',
    category: 'Hogar y Cocina',
    price: 74.90,
    compareAtPrice: 119.00,
    costPrice: 35.00,
    sku: 'HOG-AIR-FRY-65L',
    stock: 38,
    rating: 4.9,
    reviewsCount: 2450,
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&q=80'
    ],
    isFeatured: true,
    isBestSeller: true,
    isDeal: true,
    dealDiscountPercent: 37,
    tags: ['airfryer', 'cocina', 'saludable', 'hogar'],
    attributes: {
      brand: 'CrispAir',
      color: 'Negro Piano',
      warranty: '3 años'
    },
    translations: {
      es: {
        title: 'Freidora de Aire Digital XL 6.5L con Ventana Visor',
        description: 'Freidora sin aceite con potencia de 1800W, panel táctil con 10 programas preconfigurados, circulación de aire 360° y cesta antiadherente apta para lavavajillas.'
      },
      it: {
        title: 'Friggitrice ad Aria Digitale XL 6.5L con Finestra Panoramica',
        description: 'Friggitrice senza olio con potenza di 1800W, pannello touch con 10 programmi preimpostati, circolazione aria 360° e cestello antiaderente lavabile in lavastoviglie.'
      },
      en: {
        title: 'XL 6.5L Digital Air Fryer with Viewing Window & 10 Presets',
        description: 'Oil-free air fryer with 1800W rapid heating, intuitive touch control panel, 360° high-speed air circulation, and non-stick dishwasher-safe basket.'
      },
      fr: {
        title: 'Friteuse Sans Huile Digitale XL 6.5L avec Fenêtre de Visualisation',
        description: 'Friteuse à air chaud 1800W, écran tactile avec 10 programmes automatiques, circulation d\'air 360° et panier antiadhésif lavable au lave-vaisselle.'
      },
      de: {
        title: 'Digitale Heißluftfritteuse XL 6,5L mit Sichtfenster & 10 Programmen',
        description: 'Ölfreie Heißluftfritteuse mit 1800W Leistung, digitalem Touchpanel, 360°-Luftzirkulation und spülmaschinenfestem Antihaft-Frittierkorb.'
      },
      pt: {
        title: 'Fritadeira Sem Óleo Digital XL 6.5L com Janela de Visualização',
        description: 'Fritadeira de ar quente com potência de 1800W, painel tátil com 10 programas predefinidos, circulação de ar 360° e cesto antiaderente lavável na máquina.'
      }
    },
    status: 'active',
    createdAt: '2026-09-01T13:30:00Z'
  }
];

// Clean empty orders array for fresh VPS production import without test dummy orders
export const INITIAL_ORDERS: StoreOrder[] = [];

export const INITIAL_PLUGINS: PluginDefinition[] = [
  {
    id: 'plugin_paypal',
    key: 'paypal_gateway',
    name: 'PayPal Commerce Gateway',
    category: 'payment',
    description: 'Permite a tus clientes pagar con su cuenta PayPal, tarjetas de crédito/débito o financiación en 3 plazos.',
    version: '2.4.1',
    author: 'Fenix Core Team',
    iconName: 'CreditCard',
    isEnabled: true,
    isCore: true,
    config: {
      clientId: 'sb-paypal-live-client-id-fnx99',
      sandboxMode: true,
      instantPaymentNotification: true,
      displaySmartButtons: true,
      currency: 'EUR'
    },
    settingsFields: [
      { key: 'clientId', label: 'Client ID de PayPal', type: 'text', placeholder: 'Pega tu Client ID de PayPal' },
      { key: 'sandboxMode', label: 'Modo Pruebas (Sandbox)', type: 'boolean', defaultValue: true },
      { key: 'displaySmartButtons', label: 'Habilitar Smart Payment Buttons', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'plugin_stripe',
    key: 'stripe_payments',
    name: 'Stripe Elements & Apple/Google Pay',
    category: 'payment',
    description: 'Acepta pagos con tarjeta bancaria (Visa, Mastercard, AMEX), Apple Pay y Google Pay con 3D Secure 2.',
    version: '3.1.0',
    author: 'Fenix Core Team',
    iconName: 'CreditCard',
    isEnabled: true,
    isCore: true,
    config: {
      publishableKey: 'pk_live_51M001FenixCmsStore',
      enableApplePay: true,
      enableGooglePay: true,
      statementDescriptor: 'MI TIENDA ONLINE'
    },
    settingsFields: [
      { key: 'publishableKey', label: 'Clave Pública Stripe (pk_...)', type: 'text', placeholder: 'pk_test_...' },
      { key: 'statementDescriptor', label: 'Texto en extracto bancario', type: 'text', placeholder: 'NOMBRE TIENDA' },
      { key: 'enableApplePay', label: 'Habilitar Apple Pay', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'plugin_bank_transfer',
    key: 'bank_wire',
    name: 'Transferencia Bancaria Manual',
    category: 'payment',
    description: 'Proporciona a tus clientes las instrucciones bancarias (IBAN y titular) para transferencias directas.',
    version: '1.2.0',
    author: 'Fenix Core Team',
    iconName: 'Building2',
    isEnabled: true,
    isCore: true,
    config: {
      accountHolder: 'Mi Tienda Online SL',
      iban: 'ES91 2100 0418 4502 0005 1332',
      bankName: 'CaixaBank / BBVA',
      instructions: 'Indica tu número de pedido en el concepto de la transferencia.'
    },
    settingsFields: [
      { key: 'accountHolder', label: 'Titular de la cuenta', type: 'text' },
      { key: 'iban', label: 'Número de Cuenta / IBAN', type: 'text' },
      { key: 'bankName', label: 'Nombre del Banco / Entidad', type: 'text' },
      { key: 'instructions', label: 'Instrucciones para el cliente', type: 'textarea' }
    ]
  },
  {
    id: 'plugin_cash_on_delivery',
    key: 'cod_gateway',
    name: 'Pago Contrarrembolso (COD)',
    category: 'payment',
    description: 'El cliente abona el importe en efectivo o tarjeta al mensajero en el momento de la entrega.',
    version: '1.5.2',
    author: 'Fenix Core Team',
    iconName: 'Banknote',
    isEnabled: true,
    isCore: true,
    config: {
      extraFee: 3.00,
      maxOrderAmount: 500,
      enabledCountries: ['España', 'Portugal', 'Italia']
    },
    settingsFields: [
      { key: 'extraFee', label: 'Recargo adicional por gestión (€)', type: 'number', defaultValue: 3.00 },
      { key: 'maxOrderAmount', label: 'Importe máximo permitido (€)', type: 'number', defaultValue: 500 }
    ]
  },
  {
    id: 'plugin_correos',
    key: 'correos_express_shipping',
    name: 'Correos Envíos Express & Paquetería',
    category: 'shipping',
    description: 'Integración oficial con Correos Express: cálculo de tarifas, generación de albaranes y tracking de seguimiento.',
    version: '2.0.4',
    author: 'Correos & Fenix Integration',
    iconName: 'Truck',
    isEnabled: true,
    isCore: true,
    config: {
      clientContractNumber: 'COR-EXP-77291',
      autoGenerateTracking: true,
      domesticStandardDays: '24-48h',
      internationalDays: '3-5 días',
      senderCity: 'Madrid'
    },
    settingsFields: [
      { key: 'clientContractNumber', label: 'Nº Contrato / Código Cliente Correos', type: 'text' },
      { key: 'autoGenerateTracking', label: 'Generar código de tracking automáticamente', type: 'boolean', defaultValue: true },
      { key: 'domesticStandardDays', label: 'Tiempo estimado península', type: 'text', defaultValue: '24-48h' }
    ]
  },
  {
    id: 'plugin_fenix_import',
    key: 'fenix_all_import_pro',
    name: 'Fenix All Import Pro',
    category: 'import',
    description: 'Importador masivo universal: sube archivos CSV, XML o JSON con mapeo visual arrastrable de campos para productos.',
    version: '4.8.0',
    author: 'Fenix Tools Lab',
    iconName: 'FileSpreadsheet',
    isEnabled: true,
    isCore: true,
    config: {
      batchSize: 100,
      updateExistingBySku: true,
      autoCreateCategories: true,
      downloadRemoteImages: true
    },
    settingsFields: [
      { key: 'batchSize', label: 'Tamaño de lote (registros)', type: 'number', defaultValue: 100 },
      { key: 'updateExistingBySku', label: 'Actualizar productos existentes si coincide el SKU', type: 'boolean', defaultValue: true },
      { key: 'autoCreateCategories', label: 'Crear nuevas categorías automáticamente', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'plugin_ai_gemini',
    key: 'ai_copilot',
    name: 'Asistente IA Generativo (Gemini)',
    category: 'ai',
    description: 'Genera fichas de producto profesionales, optimización de palabras clave SEO y traduce catálogos a 6 idiomas en 1 clic.',
    version: '2.1.0',
    author: 'Google AI Studio & Fenix',
    iconName: 'Sparkles',
    isEnabled: true,
    isCore: true,
    config: {
      model: 'gemini-2.5-flash',
      autoSeoMeta: true,
      tone: 'persuasive'
    },
    settingsFields: [
      { key: 'autoSeoMeta', label: 'Generar meta etiquetas SEO automáticamente', type: 'boolean', defaultValue: true }
    ]
  },
  {
    id: 'plugin_abandoned_cart',
    key: 'cart_recovery',
    name: 'Recuperación de Carritos & Notificaciones',
    category: 'marketing',
    description: 'Envío automático de recordatorios por email con cupones de descuento para carritos no finalizados.',
    version: '1.4.0',
    author: 'Growth Labs',
    iconName: 'Send',
    isEnabled: true,
    isCore: false,
    config: {
      sendAfterHours: 2,
      discountPercent: 10,
      templateSubject: '¿Olvidaste productos en tu carrito de compra?'
    }
  }
];

export const INITIAL_THEMES: ThemeDefinition[] = [
  {
    id: 'theme_fenix_market',
    key: 'fenix_marketplace',
    name: 'Fenix Marketplace Theme',
    description: 'El diseño definitivo para máxima conversión comercial: mega-barra de búsqueda inteligente, menú por departamentos, ofertas flash y alta densidad de ventas.',
    previewImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80',
    badge: 'Recomendado para E-commerce',
    colors: {
      primary: '#131921',
      secondary: '#232f3e',
      accent: '#febd69',
      background: '#e3e6e6',
      headerBg: '#131921',
      headerText: '#ffffff'
    },
    typography: {
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif'
    },
    layout: {
      bannerStyle: 'fenix_deal_slider',
      productCardStyle: 'fenix_dense'
    }
  },
  {
    id: 'theme_boutique',
    key: 'boutique_minimal',
    name: 'Boutique Minimalist',
    description: 'Lujo, espacios en blanco y tipografía editorial para marcas exclusivas de moda y diseño.',
    previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
    badge: 'Moda y Lujo',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#d97706',
      background: '#fafafa',
      headerBg: '#ffffff',
      headerText: '#111827'
    },
    typography: {
      headingFont: 'Playfair Display, serif',
      bodyFont: 'Plus Jakarta Sans, sans-serif'
    },
    layout: {
      bannerStyle: 'hero_minimal',
      productCardStyle: 'clean_card'
    }
  },
  {
    id: 'theme_tech_dark',
    key: 'cyber_tech',
    name: 'Modern Cyber Tech',
    description: 'Tema con estética tecnológica para componentes, gadgets y electrónica de consumo.',
    previewImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80',
    badge: 'Gadgets & Gaming',
    colors: {
      primary: '#090d16',
      secondary: '#1e293b',
      accent: '#38bdf8',
      background: '#0f172a',
      headerBg: '#0b1120',
      headerText: '#f8fafc'
    },
    typography: {
      headingFont: 'Inter, sans-serif',
      bodyFont: 'Inter, sans-serif'
    },
    layout: {
      bannerStyle: 'modern_grid',
      productCardStyle: 'bordered'
    }
  }
];

export const INITIAL_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 'mkt_redsys_bizum',
    name: 'Redsys Oficial + Bizum TPV Virtual',
    slug: 'redsys-bizum-gateway',
    type: 'plugin',
    category: 'payment',
    shortDescription: 'Pasarela oficial de pago bancario español con Bizum y 3DSecure 2.0 integrado.',
    description: 'Permite a los clientes pagar con tarjeta bancaria de bancos españoles y Bizum al instante.',
    price: 39,
    billingType: 'one_time',
    badge: 'Top Ventas',
    author: 'Fenix Dev Official',
    version: '2.4.0',
    rating: 4.9,
    salesCount: 142,
    isPublished: true,
    isFeatured: true,
    downloadFileName: 'plugin-redsys-bizum-v2.4.0.zip',
    createdAt: '2026-08-15T12:00:00Z'
  },
  {
    id: 'mkt_whatsapp_orders',
    name: 'WhatsApp Bot de Notificaciones & Carritos',
    slug: 'whatsapp-order-notifications',
    type: 'plugin',
    category: 'marketing',
    shortDescription: 'Envía tickets de compra, tracking de envíos y recordatorios de carritos por WhatsApp.',
    description: 'Automatiza la comunicación directa con tus compradores aumentando la conversión un +28%.',
    price: 19,
    billingType: 'subscription_monthly',
    badge: 'Alta Conversión',
    author: 'Connect Automation Labs',
    version: '1.8.2',
    rating: 4.8,
    salesCount: 89,
    isPublished: true,
    isFeatured: true,
    downloadFileName: 'plugin-whatsapp-alerts-v1.8.2.zip',
    createdAt: '2026-08-20T14:30:00Z'
  },
  {
    id: 'mkt_correos_seur',
    name: 'Correos Express & SEUR Connector Pro',
    slug: 'correos-seur-logistics',
    type: 'plugin',
    category: 'shipping',
    shortDescription: 'Generación automática de etiquetas térmicas PDF y recogida con transportistas.',
    description: 'Imprime albaranes de envío en 1 clic y proporciona número de seguimiento en tiempo real.',
    price: 29,
    billingType: 'one_time',
    badge: 'Logística',
    author: 'Logistics Pro',
    version: '3.1.0',
    rating: 4.7,
    salesCount: 110,
    isPublished: true,
    isFeatured: false,
    downloadFileName: 'plugin-correos-seur-v3.1.0.zip',
    createdAt: '2026-08-25T09:15:00Z'
  },
  {
    id: 'mkt_chatgpt_seo',
    name: 'Gemini / ChatGPT SEO Meta-Tags & Copywriter',
    slug: 'gemini-seo-copywriter',
    type: 'plugin',
    category: 'ai',
    shortDescription: 'Genera descripciones de productos y optimiza snippet de Google con Inteligencia Artificial.',
    description: 'Aumenta el tráfico orgánico indexando palabras clave automáticas en tus categorías y fichas.',
    price: 15,
    billingType: 'subscription_monthly',
    badge: 'IA Integrada',
    author: 'Fenix AI Labs',
    version: '1.2.0',
    rating: 4.9,
    salesCount: 76,
    isPublished: true,
    isFeatured: true,
    downloadFileName: 'plugin-ai-seo-v1.2.0.zip',
    createdAt: '2026-09-01T11:00:00Z'
  },
  {
    id: 'mkt_theme_nordic',
    name: 'Nordic Clean Marketplace Theme',
    slug: 'nordic-clean-theme',
    type: 'theme',
    category: 'theme',
    shortDescription: 'Plantilla minimalista de alta velocidad optimizada para grandes catálogos y móviles.',
    description: 'Diseño escandinavo limpio con cuadrícula adaptativa, filtros instantáneos y modo oscuro opcional.',
    price: 49,
    billingType: 'one_time',
    badge: 'Nuevo Tema',
    previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    author: 'Studio Nordique',
    version: '2.1.0',
    rating: 5.0,
    salesCount: 53,
    isPublished: true,
    isFeatured: true,
    downloadFileName: 'theme-nordic-clean-v2.1.0.zip',
    createdAt: '2026-08-28T16:00:00Z'
  },
  {
    id: 'mkt_theme_cyber',
    name: 'Cyberpunk Dark Electronics Theme',
    slug: 'cyber-dark-theme',
    type: 'theme',
    category: 'theme',
    shortDescription: 'Tema oscuro con acentos neón y alto impacto visual para tecnología, gadgets y gaming.',
    description: 'Especialmente concebido para tiendas de hardware, componentes de PC y electrónica de vanguardia.',
    price: 59,
    billingType: 'one_time',
    badge: 'Premium',
    previewImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    author: 'CyberUI Labs',
    version: '1.5.0',
    rating: 4.9,
    salesCount: 68,
    isPublished: true,
    isFeatured: true,
    downloadFileName: 'theme-cyber-dark-v1.5.0.zip',
    createdAt: '2026-08-30T10:00:00Z'
  }
];
