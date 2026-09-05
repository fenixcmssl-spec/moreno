import { SupportedLocale, ProductItem } from '@/types';

export const LANGUAGES: { code: SupportedLocale; name: string; flag: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

export const CATEGORY_TRANSLATIONS: Record<string, Record<SupportedLocale, string>> = {
  'all': {
    es: 'Todos los departamentos',
    it: 'Tutti i reparti',
    en: 'All Departments',
    fr: 'Tous les rayons',
    de: 'Alle Abteilungen',
    pt: 'Todos os departamentos'
  },
  'Electrónica': {
    es: 'Electrónica',
    it: 'Elettronica',
    en: 'Electronics',
    fr: 'Électronique',
    de: 'Elektronik',
    pt: 'Eletrónicos'
  },
  'Hogar y Cocina': {
    es: 'Hogar y Cocina',
    it: 'Casa e Cucina',
    en: 'Home & Kitchen',
    fr: 'Maison et Cuisine',
    de: 'Küche & Haushalt',
    pt: 'Casa e Cozinha'
  },
  'Informática': {
    es: 'Informática',
    it: 'Informatica',
    en: 'Computers & Tech',
    fr: 'Informatique',
    de: 'Computer & Büro',
    pt: 'Informática'
  },
  'Moda y Ropa': {
    es: 'Moda y Ropa',
    it: 'Moda e Abbigliamento',
    en: 'Fashion & Apparel',
    fr: 'Mode et Vêtements',
    de: 'Mode & Kleidung',
    pt: 'Moda e Vestuário'
  }
};

// Rich product translation catalogue for instant dynamic switching
export const PRODUCT_TRANSLATIONS_CATALOG: Record<string, Record<SupportedLocale, { title: string; description: string; attributes?: Record<string, string> }>> = {
  'prod_1': {
    es: {
      title: 'Auriculares Inalámbricos Noise Cancelling Pro ANC',
      description: 'Auriculares inalámbricos con cancelación activa de ruido híbrida de 40dB, sonido Hi-Res Audio, batería de 65 horas y micrófonos con IA para llamadas cristalinas.',
      attributes: { color: 'Negro Mate', warranty: '3 años de garantía oficial', brand: 'SoundPulse' }
    },
    it: {
      title: 'Cuffie Wireless con Cancellazione Attiva del Rumore Pro ANC',
      description: 'Cuffie wireless con cancellazione attiva del rumore ibrida da 40dB, audio Hi-Res, autonomia di 65 ore e microfoni con intelligenza artificiale per chiamate cristalline.',
      attributes: { color: 'Nero Opaco', warranty: '3 anni di garanzia ufficiale', brand: 'SoundPulse' }
    },
    en: {
      title: 'Wireless Active Noise Cancelling Over-Ear Headphones Pro',
      description: 'Premium wireless headphones with 40dB hybrid active noise cancellation, Hi-Res certified sound, 65-hour battery life, and AI-powered crystal-clear microphones.',
      attributes: { color: 'Matte Black', warranty: '3 years official warranty', brand: 'SoundPulse' }
    },
    fr: {
      title: 'Casque Sans Fil à Réduction de Bruit Active Pro ANC',
      description: 'Casque sans fil avec réduction active du bruit hybride de 40 dB, son Hi-Res Audio, autonomie exceptionnelle de 65 heures et micros IA pour des appels haute clarté.',
      attributes: { color: 'Noir Mat', warranty: 'Garantie officielle 3 ans', brand: 'SoundPulse' }
    },
    de: {
      title: 'Kabellose Over-Ear-Kopfhörer mit Noise Cancelling Pro ANC',
      description: 'Kabellose Premium-Kopfhörer mit 40dB hybrider aktiver Geräuschunterdrückung, Hi-Res-Audioqualität, 65 Stunden Akkulaufzeit und KI-Mikrofonen für klare Telefonate.',
      attributes: { color: 'Mattschwarz', warranty: '3 Jahre offizielle Garantie', brand: 'SoundPulse' }
    },
    pt: {
      title: 'Auscultadores Sem Fios com Cancelamento de Ruído Pro ANC',
      description: 'Auscultadores sem fios com cancelamento de ruído ativo híbrido de 40dB, áudio Hi-Res, bateria de 65 horas e microfones com IA para chamadas de alta nitidez.',
      attributes: { color: 'Preto Mate', warranty: '3 anos de garantia oficial', brand: 'SoundPulse' }
    }
  },
  'prod_2': {
    es: {
      title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
      description: 'Reloj inteligente con pantalla AMOLED de alta resolución, GPS integrado, sensor SpO2, monitor de frecuencia cardíaca 24/7 y más de 120 modos deportivos.',
      attributes: { color: 'Plata Titanio', warranty: '2 años de garantía', brand: 'ChronosTech' }
    },
    it: {
      title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
      description: 'Orologio intelligente con display AMOLED ad alta risoluzione, GPS integrato, sensore SpO2, cardiofrequenzimetro 24/7 e oltre 120 modalità sportive.',
      attributes: { color: 'Argento Titanio', warranty: '2 anni di garanzia', brand: 'ChronosTech' }
    },
    en: {
      title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
      description: 'Smartwatch featuring high-res AMOLED display, built-in GPS, SpO2 blood oxygen sensor, 24/7 heart rate monitor, and 120+ sport modes.',
      attributes: { color: 'Titanium Silver', warranty: '2 years warranty', brand: 'ChronosTech' }
    },
    fr: {
      title: 'Montre Connectée Fitness Tracker Ultra AMOLED 1.95" GPS',
      description: 'Montre intelligente avec écran AMOLED haute résolution, GPS intégré, capteur SpO2, suivi cardiaque 24/7 et plus de 120 modes sportifs.',
      attributes: { color: 'Argent Titane', warranty: '2 ans de garantie', brand: 'ChronosTech' }
    },
    de: {
      title: 'Smartwatch Fitness-Tracker Ultra AMOLED 1,95" GPS',
      description: 'Smartwatch mit hochauflösendem AMOLED-Display, integriertem GPS, SpO2-Blutsauerstoffsensor, 24/7-Herzfrequenzmessung und über 120 Sportmodi.',
      attributes: { color: 'Titan-Silber', warranty: '2 Jahre Garantie', brand: 'ChronosTech' }
    },
    pt: {
      title: 'Smartwatch Fitness Tracker Ultra Amoled 1.95" GPS',
      description: 'Relógio inteligente com ecrã AMOLED de alta definição, GPS integrado, sensor SpO2, monitor de ritmo cardíaco 24/7 e mais de 120 modos desportivos.',
      attributes: { color: 'Prata Titânio', warranty: '2 anos de garantia', brand: 'ChronosTech' }
    }
  },
  'prod_3': {
    es: {
      title: 'Cafetera Espresso Automática 20 Bares con Vaporizador',
      description: 'Cafetera de espresso y cappuccino con bomba italiana de 20 bares, depósito de agua de 1.5L extraíble, calentador de tazas y acabado en acero inoxidable cepillado.',
      attributes: { color: 'Acero Inox', warranty: '3 años de garantía', brand: 'BaristaPro' }
    },
    it: {
      title: 'Macchina da Caffè Espresso Automatica 20 Bar con Montalatte',
      description: 'Macchina per espresso e cappuccino con pompa italiana a 20 bar, serbatoio da 1.5L rimovibile, scaldatazze e finitura in acciaio inossidabile satinato.',
      attributes: { color: 'Acciaio Inox', warranty: '3 anni di garanzia', brand: 'BaristaPro' }
    },
    en: {
      title: 'Automatic Espresso & Cappuccino Maker 20-Bar with Milk Frother',
      description: 'Espresso machine with 20-bar Italian pump, 1.5L removable water tank, heated cup warmer plate, and brushed stainless steel finish.',
      attributes: { color: 'Stainless Steel', warranty: '3 years warranty', brand: 'BaristaPro' }
    },
    fr: {
      title: 'Machine à Café Espresso Automatique 20 Bars avec Buse Vapeur',
      description: 'Machine à café espresso et cappuccino avec pompe italienne 20 bars, réservoir d\'eau 1.5L amovible, chauffe-tasses et finition inox brossé.',
      attributes: { color: 'Acier Inoxydable', warranty: '3 ans de garantie', brand: 'BaristaPro' }
    },
    de: {
      title: 'Automatische Espresso-Kaffeemaschine 20 Bar mit Milchaufschäumer',
      description: 'Espresso- und Cappuccinomaschine mit 20-Bar-Italienpumpe, abnehmbarem 1,5L-Wassertank, Tassenwärmer und gebürstetem Edelstahl-Design.',
      attributes: { color: 'Edelstahl', warranty: '3 Jahre Garantie', brand: 'BaristaPro' }
    },
    pt: {
      title: 'Máquina de Café Espresso Automática 20 Bares com Vaporizador',
      description: 'Máquina de café espresso e cappuccino com bomba italiana de 20 bares, depósito de 1.5L removível, aquecedor de chávenas e acabamento em aço inoxidável.',
      attributes: { color: 'Aço Inoxidável', warranty: '3 anos de garantia', brand: 'BaristaPro' }
    }
  },
  'prod_4': {
    es: {
      title: 'Teclado Mecánico RGB Gaming Inalámbrico 75% Hot-Swap',
      description: 'Teclado mecánico compacto con switches táctiles intercambiables en caliente, iluminación RGB programable por tecla, conexión Bluetooth 5.2 / 2.4Ghz y USB-C.',
      attributes: { color: 'Gris Grafito', warranty: '2 años de garantía', brand: 'ViperKeys' }
    },
    it: {
      title: 'Tastiera Meccanica RGB Gaming Wireless 75% Hot-Swap',
      description: 'Tastiera meccanica compatta con switch tattili sostituibili a caldo, illuminazione RGB programmabile, tripla connessione Bluetooth 5.2, 2.4GHz e USB-C.',
      attributes: { color: 'Grigio Grafite', warranty: '2 anni di garanzia', brand: 'ViperKeys' }
    },
    en: {
      title: 'Wireless 75% Hot-Swappable Mechanical Gaming Keyboard RGB',
      description: 'Compact mechanical keyboard with hot-swappable tactile switches, per-key programmable RGB lighting, triple connectivity (Bluetooth 5.2 / 2.4GHz / Type-C).',
      attributes: { color: 'Graphite Grey', warranty: '2 years warranty', brand: 'ViperKeys' }
    },
    fr: {
      title: 'Clavier Mécanique Gamer Sans Fil 75% Hot-Swap RGB',
      description: 'Clavier mécanique compact avec switches tactiles interchangeables à chaud, rétroéclairage RGB personnalisable, triple connexion Bluetooth / 2.4GHz / USB-C.',
      attributes: { color: 'Gris Graphite', warranty: '2 ans de garantie', brand: 'ViperKeys' }
    },
    de: {
      title: 'Kabellose Mechanische 75% Gaming-Tastatur RGB Hot-Swap',
      description: 'Kompakte mechanische Tastatur mit Hot-Swap-Switches, programmierbarer Einzeltasten-RGB-Beleuchtung, Bluetooth 5.2 / 2.4GHz Funk und USB-C.',
      attributes: { color: 'Graphitgrau', warranty: '2 Jahre Garantie', brand: 'ViperKeys' }
    },
    pt: {
      title: 'Teclado Mecânico RGB Gaming Sem Fios 75% Hot-Swap',
      description: 'Teclado mecânico compacto com switches táteis hot-swap, iluminação RGB tecla a tecla, ligação Bluetooth 5.2 / 2.4Ghz e cabo USB-C.',
      attributes: { color: 'Cinza Grafite', warranty: '2 anos de garantia', brand: 'ViperKeys' }
    }
  },
  'prod_5': {
    es: {
      title: 'Mochila Impermeable para Portátil 15.6" con Puerto USB',
      description: 'Mochila ergonómica de viaje y trabajo con compartimento acolchado para laptop, bolsillos antirrobo ocultos, tejido hidrófugo y conector USB de carga externa.',
      attributes: { color: 'Negro Carbón', warranty: '2 años de garantía', brand: 'NordicPack' }
    },
    it: {
      title: 'Zaino Impermeabile per Computer Portatile 15.6" con Porta USB',
      description: 'Zaino ergonomico da viaggio e lavoro con scomparto imbottito per laptop, tasche antifurto nascoste, tessuto idrorepellente e porta di ricarica USB esterna.',
      attributes: { color: 'Nero Carbone', warranty: '2 anni di garanzia', brand: 'NordicPack' }
    },
    en: {
      title: 'Waterproof Anti-Theft 15.6" Laptop Backpack with USB Charging Port',
      description: 'Ergonomic business and travel backpack with padded laptop sleeve, hidden anti-theft security pockets, water-resistant fabric, and external USB charging port.',
      attributes: { color: 'Carbon Black', warranty: '2 years warranty', brand: 'NordicPack' }
    },
    fr: {
      title: 'Sac à Dos Imperméable pour Ordinateur Portable 15.6" avec Port USB',
      description: 'Sac à dos ergonomique pour voyage et travail avec compartiment rembourré pour PC portable, poches antivol cachées, tissu déperlant et port de charge USB.',
      attributes: { color: 'Noir Carbone', warranty: '2 ans de garantie', brand: 'NordicPack' }
    },
    de: {
      title: 'Wasserdichter 15,6" Laptop-Rucksack mit Diebstahlschutz & USB',
      description: 'Ergonomischer Business- und Reiserucksack mit gepolstertem Laptopfach, verdeckten Anti-Diebstahl-Taschen, wasserabweisendem Stoff und externem USB-Port.',
      attributes: { color: 'Carbonschwarz', warranty: '2 Jahre Garantie', brand: 'NordicPack' }
    },
    pt: {
      title: 'Mochila Impermeável para Portátil 15.6" com Porta USB',
      description: 'Mochila ergonómica para viagem e trabalho com compartimento almofadado para portátil, bolsos antifurto ocultos, tecido repelente de água e porta USB.',
      attributes: { color: 'Preto Carbono', warranty: '2 anos de garantia', brand: 'NordicPack' }
    }
  },
  'prod_6': {
    es: {
      title: 'Freidora de Aire Digital XL 6.5L con Ventana Visor',
      description: 'Freidora sin aceite con potencia de 1800W, panel táctil con 10 programas preconfigurados, circulación de aire 360° y cesta antiadherente apta para lavavajillas.',
      attributes: { color: 'Negro Piano', warranty: '3 años de garantía', brand: 'CrispAir' }
    },
    it: {
      title: 'Friggitrice ad Aria Digitale XL 6.5L con Finestra Panoramica',
      description: 'Friggitrice senza olio con potenza di 1800W, pannello touch con 10 programmi preimpostati, circolazione aria 360° e cestello antiaderente lavabile in lavastoviglie.',
      attributes: { color: 'Nero Pianoforte', warranty: '3 anni di garanzia', brand: 'CrispAir' }
    },
    en: {
      title: 'XL 6.5L Digital Air Fryer with Viewing Window & 10 Presets',
      description: 'Oil-free air fryer with 1800W rapid heating, intuitive touch control panel, 360° high-speed air circulation, and non-stick dishwasher-safe basket.',
      attributes: { color: 'Piano Black', warranty: '3 years warranty', brand: 'CrispAir' }
    },
    fr: {
      title: 'Friteuse Sans Huile Digitale XL 6.5L avec Fenêtre de Visualisation',
      description: 'Friteuse à air chaud 1800W, écran tactile avec 10 programmes automatiques, circulation d\'air 360° et panier antiadhésif lavable au lave-vaisselle.',
      attributes: { color: 'Noir Piano', warranty: 'Garantie 3 ans', brand: 'CrispAir' }
    },
    de: {
      title: 'Digitale Heißluftfritteuse XL 6,5L mit Sichtfenster & 10 Programmen',
      description: 'Ölfreie Heißluftfritteuse mit 1800W Leistung, digitalem Touchpanel, 360°-Luftzirkulation und spülmaschinenfestem Antihaft-Frittierkorb.',
      attributes: { color: 'Pianoschwarz', warranty: '3 Jahre Garantie', brand: 'CrispAir' }
    },
    pt: {
      title: 'Fritadeira Sem Óleo Digital XL 6.5L com Janela de Visualização',
      description: 'Fritadeira de ar quente com potência de 1800W, painel tátil com 10 programas predefinidos, circulação de ar 360° e cesto antiaderente lavável na máquina.',
      attributes: { color: 'Preto Piano', warranty: '3 anos de garantia', brand: 'CrispAir' }
    }
  }
};

export const DICTIONARY: Record<SupportedLocale, Record<string, string>> = {
  es: {
    // Top Bar & Navigation
    'nav.environments': 'Entornos:',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Tienda Cliente',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Login Backend',
    'nav.reset': 'Restaurar',
    'nav.logout': 'Salir',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Shopper Account',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'Centro de mando del propietario del SaaS: venta de plugins/temas, precios de suscripción, duración de licencias y multi-tenant.',
    'superadmin.active_session': 'Sesión activa',
    'superadmin.emit_license': 'Emitir Licencia',
    'superadmin.sell_addon': 'Poner en Venta Add-on',
    'superadmin.view_commercial': 'Ver Portal Comercial',
    'superadmin.logout': 'Salir',
    'superadmin.kpi_mrr': 'MRR ESTIMADO',
    'superadmin.kpi_mrr_sub': 'Recurrente mensual',
    'superadmin.kpi_active_lic': 'LICENCIAS ACTIVAS',
    'superadmin.kpi_active_lic_sub': 'licencias totales emitidas',
    'superadmin.kpi_addons': 'ADD-ONS EN VENTA',
    'superadmin.kpi_addons_sub': 'Plugins y temas en catálogo',
    'superadmin.kpi_products': 'PRODUCTOS EN RED',
    'superadmin.kpi_products_sub': 'Sincronizados en Firestore',
    'superadmin.tab_licenses': 'Licencias & Duración',
    'superadmin.tab_plans': 'Catálogo de Planes & Precios',
    'superadmin.tab_marketplace': 'Marketplace Add-ons a la Venta',
    'superadmin.tab_tenants': 'Tiendas & Tenants Desplegados',
    'superadmin.search_licenses': 'Buscar por cliente, email, clave o tienda...',
    'superadmin.filter_all': 'Todos',
    'superadmin.filter_plugins': 'Plugins',
    'superadmin.filter_themes': 'Temas',
    'superadmin.col_client': 'Cliente / Tienda',
    'superadmin.col_key': 'Clave de Licencia',
    'superadmin.col_plan': 'Plan / Precio',
    'superadmin.col_validity': 'Validez / Vencimiento',
    'superadmin.col_status': 'Estado',
    'superadmin.col_actions': 'Acciones',
    'superadmin.status_active': 'Activa',
    'superadmin.status_expired': 'Expirada',
    'superadmin.status_suspended': 'Suspendida',
    'superadmin.lifetime': 'Permanente (Lifetime)',
    'superadmin.edit': 'Editar',
    'superadmin.extend': 'Extender',
    'superadmin.suspend': 'Suspender',
    'superadmin.activate': 'Reactivar',
    'superadmin.delete': 'Eliminar',
    'superadmin.save': 'Guardar Cambios',
    'superadmin.cancel': 'Cancelar',

    // Storefront Header & Hero
    'store.deliver_to': 'Enviar a',
    'store.country_default': 'España (28013)',
    'store.all_departments': 'Todos los departamentos',
    'store.search_placeholder': 'Buscar en la tienda...',
    'store.account_greeting': 'Hola, Identifícate',
    'store.account_and_lists': 'Cuenta y Pedidos',
    'store.cart': 'Cesta',
    'store.all_menu': 'Todo',
    'store.flash_deals_nav': 'Ofertas Flash de Hoy',
    'store.correos_badge': 'Envío Correos Express 24h',
    'store.manage_store_btn': '⚙️ Administrar Tienda',

    // Hero banner & Countdown
    'store.hero_badge': 'OFERTAS FLASH DE LA SEMANA — HASTA 45% DTO',
    'store.hero_title': 'Los mejores productos de Electrónica, Hogar y Gadgets con Envío Gratis',
    'store.hero_desc': 'Garantía oficial de 3 años, pago seguro con PayPal, Stripe, Contrarrembolso y entrega rápida mediante Correos Express.',
    'store.countdown_label': 'La oferta finaliza en:',
    'store.free_shipping_notice': 'Envío gratuito en pedidos superiores a',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Escaparate de Productos Destacados',
    'store.category_label': 'Categoría:',
    'store.showing_items': 'Mostrando artículos disponibles en stock',
    'store.sort_by': 'Ordenar por:',
    'store.sort_featured': 'Recomendados / Más vendidos',
    'store.sort_price_low': 'Precio: de menor a mayor',
    'store.sort_price_high': 'Precio: de mayor a menor',
    'store.sort_rating': 'Mejor valorados',

    // Product Card
    'store.bestseller_badge': '#1 Más Vendido',
    'store.correos_shipping': 'Envío con Correos Express',
    'store.add_to_cart': 'Añadir a la Cesta',
    'store.buy_now': 'Comprar ya',

    // Product Details Modal
    'store.in_stock': '✓ En stock',
    'store.units_available': 'unidades disponibles para envío hoy',
    'store.brand': 'Marca:',
    'store.color': 'Color:',
    'store.warranty': 'Garantía:',
    'store.reviews_count': 'valoraciones de clientes verificadas',
    'store.buy_with_1click': 'Comprar con 1 Clic',

    // Cart Drawer
    'store.cart_title': 'Tu Cesta de la Compra',
    'store.free_shipping_achieved': '🎉 ¡Felicidades! Tienes Envío GRATIS con Correos Express',
    'store.free_shipping_progress': 'Añade',
    'store.free_shipping_progress_tail': 'más para conseguir Envío GRATIS',
    'store.empty_cart': 'Tu cesta está vacía. Descubre nuestras ofertas.',
    'store.subtotal': 'Subtotal',
    'store.checkout_cta': 'Tramitar Pedido',
    'store.clear_cart': 'Vaciar Cesta',

    // Checkout
    'checkout.title': 'Finalizar Compra Segura',
    'checkout.step1': '1. Datos de Envío y Contacto',
    'checkout.step2': '2. Método de Envío con Correos Express',
    'checkout.step3': '3. Seleccionar Método de Pago Seguro',
    'checkout.step4': '4. Resumen del Pedido',
    'checkout.full_name': 'Nombre Completo',
    'checkout.email': 'Correo Electrónico',
    'checkout.address': 'Dirección Completa',
    'checkout.city': 'Ciudad / Localidad',
    'checkout.postal_code': 'Código Postal',
    'checkout.country': 'País de Destino',
    'checkout.phone': 'Teléfono Móvil (para SMS de entrega Correos)',
    'checkout.order_summary': 'Resumen de Compra',
    'checkout.subtotal_label': 'Subtotal productos:',
    'checkout.shipping_label': 'Gastos de envío:',
    'checkout.free_shipping_val': 'GRATIS',
    'checkout.cod_fee_label': 'Suplemento contrarrembolso:',
    'checkout.tax_label': 'IVA (21% incluido):',
    'checkout.total_label': 'Total a pagar:',
    'checkout.place_order_btn': 'Confirmar y Pagar Pedido',
    'checkout.processing_btn': 'Procesando Pedido con Pasarela...',
    'checkout.success_title': '¡Pedido Realizado con Éxito!',
    'checkout.order_number': 'Número de Pedido:',
    'checkout.tracking_number': 'Código de Seguimiento Correos:',
    'checkout.continue_shopping': 'Seguir Comprando',

    // Merchant Backoffice
    'merchant.title': 'Panel de Control CMS de la Tienda',
    'merchant.dashboard': 'Dashboard',
    'merchant.products': 'Productos',
    'merchant.orders': 'Pedidos',
    'merchant.plugins': 'Plugins y Extensiones',
    'merchant.themes': 'Temas y Apariencia',
    'merchant.wp_import': 'Importador Fenix All Import Pro',
    'merchant.languages': 'Idiomas y Traducción',
    'merchant.settings': 'Ajustes de Tienda',
    'merchant.add_product': 'Añadir Producto',
  },

  it: {
    // Top Bar & Navigation
    'nav.environments': 'Ambienti:',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Negozio Cliente',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Login Backend',
    'nav.reset': 'Ripristina',
    'nav.logout': 'Esci',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Account Acquirente',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'Centro di comando del proprietario SaaS: vendita plugin/temi, prezzi di abbonamento, durata licenze e multi-tenant.',
    'superadmin.active_session': 'Sessione attiva',
    'superadmin.emit_license': 'Emetti Licenza',
    'superadmin.sell_addon': 'Metti in Vendita Add-on',
    'superadmin.view_commercial': 'Vedi Portale Commerciale',
    'superadmin.logout': 'Esci',
    'superadmin.kpi_mrr': 'MRR STIMATO',
    'superadmin.kpi_mrr_sub': 'Ricorrente mensile',
    'superadmin.kpi_active_lic': 'LICENZE ATTIVE',
    'superadmin.kpi_active_lic_sub': 'licenze totali emesse',
    'superadmin.kpi_addons': 'ADD-ON IN VENDITA',
    'superadmin.kpi_addons_sub': 'Plugin e temi nel catalogo',
    'superadmin.kpi_products': 'PRODOTTI IN RETE',
    'superadmin.kpi_products_sub': 'Sincronizzati su Firestore',
    'superadmin.tab_licenses': 'Licenze & Durata',
    'superadmin.tab_plans': 'Catalogo Piani & Prezzi',
    'superadmin.tab_marketplace': 'Marketplace Add-on in Vendita',
    'superadmin.tab_tenants': 'Negozi & Tenant Distribuiti',
    'superadmin.search_licenses': 'Cerca per cliente, email, chiave o negozio...',
    'superadmin.filter_all': 'Tutti',
    'superadmin.filter_plugins': 'Plugin',
    'superadmin.filter_themes': 'Temi',
    'superadmin.col_client': 'Cliente / Negozio',
    'superadmin.col_key': 'Chiave di Licenza',
    'superadmin.col_plan': 'Piano / Prezzo',
    'superadmin.col_validity': 'Validità / Scadenza',
    'superadmin.col_status': 'Stato',
    'superadmin.col_actions': 'Azioni',
    'superadmin.status_active': 'Attiva',
    'superadmin.status_expired': 'Scaduta',
    'superadmin.status_suspended': 'Sospesa',
    'superadmin.lifetime': 'A vita (Lifetime)',
    'superadmin.edit': 'Modifica',
    'superadmin.extend': 'Estendi',
    'superadmin.suspend': 'Sospendi',
    'superadmin.activate': 'Riattiva',
    'superadmin.delete': 'Elimina',
    'superadmin.save': 'Salva Modifiche',
    'superadmin.cancel': 'Annulla',

    // Storefront Header & Hero
    'store.deliver_to': 'Invia a',
    'store.country_default': 'Italia (00187)',
    'store.all_departments': 'Tutti i reparti',
    'store.search_placeholder': 'Cerca nel negozio...',
    'store.account_greeting': 'Ciao, Accedi',
    'store.account_and_lists': 'Account e Liste',
    'store.cart': 'Carrello',
    'store.all_menu': 'Tutto',
    'store.flash_deals_nav': 'Offerte Lampo di Oggi',
    'store.correos_badge': 'Spedizione Rapida 24h',
    'store.manage_store_btn': '⚙️ Gestisci Negozio',

    // Hero banner & Countdown
    'store.hero_badge': 'OFFERTE LAMPO DELLA SETTIMANA — FINO AL 45% DI SCONTO',
    'store.hero_title': 'I migliori prodotti di Elettronica, Casa e Gadget con Spedizione Gratuita',
    'store.hero_desc': 'Garanzia ufficiale 3 anni, pagamento sicuro con PayPal, Stripe, Contrassegno e consegna rapida.',
    'store.countdown_label': 'L\'offerta scade tra:',
    'store.free_shipping_notice': 'Spedizione gratuita per ordini superiori a',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Vetrina Prodotti in Evidenza',
    'store.category_label': 'Categoria:',
    'store.showing_items': 'Mostrando articoli disponibili in magazzino',
    'store.sort_by': 'Ordina per:',
    'store.sort_featured': 'Consigliati / Più venduti',
    'store.sort_price_low': 'Prezzo: dal più basso al più alto',
    'store.sort_price_high': 'Prezzo: dal più alto al più basso',
    'store.sort_rating': 'Valutazione più alta',

    // Product Card
    'store.bestseller_badge': '#1 Più Venduto',
    'store.correos_shipping': 'Spedizione Rapida con Tracking',
    'store.add_to_cart': 'Aggiungi al Carrello',
    'store.buy_now': 'Acquista ora',

    // Product Details Modal
    'store.in_stock': '✓ Disponibile in stock',
    'store.units_available': 'unità disponibili per la spedizione immediata',
    'store.brand': 'Marca:',
    'store.color': 'Colore:',
    'store.warranty': 'Garanzia:',
    'store.reviews_count': 'recensioni verificate da acquirenti',
    'store.buy_with_1click': 'Acquista con 1 Clic',

    // Cart Drawer
    'store.cart_title': 'Il Tuo Carrello',
    'store.free_shipping_achieved': '🎉 Congratulazioni! Hai la Spedizione GRATUITA',
    'store.free_shipping_progress': 'Aggiungi ancora',
    'store.free_shipping_progress_tail': 'per ottenere la Spedizione GRATUITA',
    'store.empty_cart': 'Il tuo carrello è vuoto. Scopri le nostre offerte.',
    'store.subtotal': 'Subtotale',
    'store.checkout_cta': 'Procedi all\'Acquisto',
    'store.clear_cart': 'Svuota Carrello',

    // Checkout
    'checkout.title': 'Completa l\'Acquisto in Sicurezza',
    'checkout.step1': '1. Dati di Spedizione e Contatto',
    'checkout.step2': '2. Metodo di Spedizione',
    'checkout.step3': '3. Seleziona Metodo di Pagamento Sicuro',
    'checkout.step4': '4. Riepilogo dell\'Ordine',
    'checkout.full_name': 'Nome Completo',
    'checkout.email': 'Indirizzo Email',
    'checkout.address': 'Indirizzo Completo',
    'checkout.city': 'Città',
    'checkout.postal_code': 'CAP',
    'checkout.country': 'Paese di Destinazione',
    'checkout.phone': 'Cellulare (per SMS di consegna)',
    'checkout.order_summary': 'Riepilogo Ordine',
    'checkout.subtotal_label': 'Subtotale prodotti:',
    'checkout.shipping_label': 'Spese di spedizione:',
    'checkout.free_shipping_val': 'GRATIS',
    'checkout.cod_fee_label': 'Supplemento contrassegno:',
    'checkout.tax_label': 'IVA (21% inclusa):',
    'checkout.total_label': 'Totale da pagare:',
    'checkout.place_order_btn': 'Conferma e Paga Ordine',
    'checkout.processing_btn': 'Elaborazione Pagamento Sicuro...',
    'checkout.success_title': 'Ordine Effettuato con Successo!',
    'checkout.order_number': 'Numero d\'Ordine:',
    'checkout.tracking_number': 'Codice di Tracciamento:',
    'checkout.continue_shopping': 'Continua lo Shopping',

    // Merchant Backoffice
    'merchant.title': 'Pannello di Controllo CMS del Negozio',
    'merchant.dashboard': 'Dashboard',
    'merchant.products': 'Prodotti',
    'merchant.orders': 'Ordini',
    'merchant.plugins': 'Plugin ed Estensioni',
    'merchant.themes': 'Temi e Aspetto Grafico',
    'merchant.wp_import': 'Importatore Fenix All Import Pro',
    'merchant.languages': 'Lingue e Traduzioni',
    'merchant.settings': 'Impostazioni Negozio',
    'merchant.add_product': 'Aggiungi Prodotto',
  },

  en: {
    // Top Bar & Navigation
    'nav.environments': 'Environments:',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Store Front',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Login Backend',
    'nav.reset': 'Reset',
    'nav.logout': 'Sign Out',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Shopper Account',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'SaaS owner command center: plugin/theme sales, subscription pricing, license duration, and multi-tenancy.',
    'superadmin.active_session': 'Active session',
    'superadmin.emit_license': 'Issue License',
    'superadmin.sell_addon': 'List Add-on for Sale',
    'superadmin.view_commercial': 'View Commercial Portal',
    'superadmin.logout': 'Sign Out',
    'superadmin.kpi_mrr': 'ESTIMATED MRR',
    'superadmin.kpi_mrr_sub': 'Monthly recurring',
    'superadmin.kpi_active_lic': 'ACTIVE LICENSES',
    'superadmin.kpi_active_lic_sub': 'total licenses issued',
    'superadmin.kpi_addons': 'ADD-ONS FOR SALE',
    'superadmin.kpi_addons_sub': 'Plugins & themes in catalog',
    'superadmin.kpi_products': 'NETWORK PRODUCTS',
    'superadmin.kpi_products_sub': 'Synced on Firestore',
    'superadmin.tab_licenses': 'Licenses & Duration',
    'superadmin.tab_plans': 'Plans & Pricing Catalog',
    'superadmin.tab_marketplace': 'Marketplace Add-ons for Sale',
    'superadmin.tab_tenants': 'Deployed Stores & Tenants',
    'superadmin.search_licenses': 'Search by customer, email, license key or store...',
    'superadmin.filter_all': 'All',
    'superadmin.filter_plugins': 'Plugins',
    'superadmin.filter_themes': 'Themes',
    'superadmin.col_client': 'Customer / Store',
    'superadmin.col_key': 'License Key',
    'superadmin.col_plan': 'Plan / Price',
    'superadmin.col_validity': 'Validity / Expiration',
    'superadmin.col_status': 'Status',
    'superadmin.col_actions': 'Actions',
    'superadmin.status_active': 'Active',
    'superadmin.status_expired': 'Expired',
    'superadmin.status_suspended': 'Suspended',
    'superadmin.lifetime': 'Lifetime (Permanent)',
    'superadmin.edit': 'Edit',
    'superadmin.extend': 'Extend',
    'superadmin.suspend': 'Suspend',
    'superadmin.activate': 'Reactivate',
    'superadmin.delete': 'Delete',
    'superadmin.save': 'Save Changes',
    'superadmin.cancel': 'Cancel',

    // Storefront Header & Hero
    'store.deliver_to': 'Deliver to',
    'store.country_default': 'United Kingdom (SW1A 1AA)',
    'store.all_departments': 'All departments',
    'store.search_placeholder': 'Search in store...',
    'store.account_greeting': 'Hello, Sign in',
    'store.account_and_lists': 'Account & Lists',
    'store.cart': 'Cart',
    'store.all_menu': 'All',
    'store.flash_deals_nav': 'Today\'s Flash Deals',
    'store.correos_badge': '24h Express Shipping',
    'store.manage_store_btn': '⚙️ Manage Store',

    // Hero banner & Countdown
    'store.hero_badge': 'WEEKLY FLASH DEALS — UP TO 45% OFF',
    'store.hero_title': 'Top Electronics, Home Essentials & Gadgets with Free Shipping',
    'store.hero_desc': '3-year official warranty, secure payments via PayPal, Stripe, Cash on Delivery, and express 24h delivery.',
    'store.countdown_label': 'Deal ends in:',
    'store.free_shipping_notice': 'Free express shipping on orders over',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Featured Products Showcase',
    'store.category_label': 'Category:',
    'store.showing_items': 'Showing available in-stock items',
    'store.sort_by': 'Sort by:',
    'store.sort_featured': 'Featured / Best Sellers',
    'store.sort_price_low': 'Price: Low to High',
    'store.sort_price_high': 'Price: High to Low',
    'store.sort_rating': 'Customer Reviews',

    // Product Card
    'store.bestseller_badge': '#1 Best Seller',
    'store.correos_shipping': 'Fast Express Shipping',
    'store.add_to_cart': 'Add to Cart',
    'store.buy_now': 'Buy Now',

    // Product Details Modal
    'store.in_stock': '✓ In Stock',
    'store.units_available': 'units available for dispatch today',
    'store.brand': 'Brand:',
    'store.color': 'Color:',
    'store.warranty': 'Warranty:',
    'store.reviews_count': 'verified customer ratings',
    'store.buy_with_1click': 'Buy with 1-Click',

    // Cart Drawer
    'store.cart_title': 'Your Shopping Cart',
    'store.free_shipping_achieved': '🎉 Congratulations! You have FREE Express Shipping',
    'store.free_shipping_progress': 'Add',
    'store.free_shipping_progress_tail': 'more to qualify for FREE Shipping',
    'store.empty_cart': 'Your cart is empty. Check out today\'s deals.',
    'store.subtotal': 'Subtotal',
    'store.checkout_cta': 'Proceed to Checkout',
    'store.clear_cart': 'Clear Cart',

    // Checkout
    'checkout.title': 'Secure Checkout',
    'checkout.step1': '1. Shipping & Contact Info',
    'checkout.step2': '2. Express Delivery Method',
    'checkout.step3': '3. Select Secure Payment Gateway',
    'checkout.step4': '4. Order Summary',
    'checkout.full_name': 'Full Name',
    'checkout.email': 'Email Address',
    'checkout.address': 'Delivery Address',
    'checkout.city': 'City / Town',
    'checkout.postal_code': 'Postal Code',
    'checkout.country': 'Destination Country',
    'checkout.phone': 'Mobile Phone (for delivery SMS)',
    'checkout.order_summary': 'Order Summary',
    'checkout.subtotal_label': 'Item subtotal:',
    'checkout.shipping_label': 'Shipping fee:',
    'checkout.free_shipping_val': 'FREE',
    'checkout.cod_fee_label': 'Cash on delivery fee:',
    'checkout.tax_label': 'VAT included (21%):',
    'checkout.total_label': 'Total to pay:',
    'checkout.place_order_btn': 'Place & Pay Order',
    'checkout.processing_btn': 'Processing Payment Securely...',
    'checkout.success_title': 'Order Placed Successfully!',
    'checkout.order_number': 'Order Number:',
    'checkout.tracking_number': 'Postal Tracking Number:',
    'checkout.continue_shopping': 'Continue Shopping',

    // Merchant Backoffice
    'merchant.title': 'Merchant CMS Admin Backoffice',
    'merchant.dashboard': 'Dashboard',
    'merchant.products': 'Products',
    'merchant.orders': 'Orders',
    'merchant.plugins': 'Plugins & Extensions',
    'merchant.themes': 'Themes & Appearance',
    'merchant.wp_import': 'Fenix All Import Pro',
    'merchant.languages': 'Languages & Translations',
    'merchant.settings': 'Store Settings',
    'merchant.add_product': 'Add Product',
  },

  fr: {
    // Top Bar & Navigation
    'nav.environments': 'Environnements :',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Boutique Client',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Connexion Backend',
    'nav.reset': 'Réinitialiser',
    'nav.logout': 'Déconnexion',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Compte Client',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'Centre de contrôle SaaS : vente de plugins/thèmes, tarifs d\'abonnement, durée des licences et multi-tenant.',
    'superadmin.active_session': 'Session active',
    'superadmin.emit_license': 'Émettre une Licence',
    'superadmin.sell_addon': 'Mettre en Vente un Add-on',
    'superadmin.view_commercial': 'Voir Portail Commercial',
    'superadmin.logout': 'Déconnexion',
    'superadmin.kpi_mrr': 'MRR ESTIMÉ',
    'superadmin.kpi_mrr_sub': 'Récurrent mensuel',
    'superadmin.kpi_active_lic': 'LICENCES ACTIVES',
    'superadmin.kpi_active_lic_sub': 'licences totales émises',
    'superadmin.kpi_addons': 'ADD-ONS EN VENTE',
    'superadmin.kpi_addons_sub': 'Plugins et thèmes au catalogue',
    'superadmin.kpi_products': 'PRODUITS DU RÉSEAU',
    'superadmin.kpi_products_sub': 'Synchronisés sur Firestore',
    'superadmin.tab_licenses': 'Licences & Durée',
    'superadmin.tab_plans': 'Catalogue Offres & Tarifs',
    'superadmin.tab_marketplace': 'Marketplace Add-ons en Vente',
    'superadmin.tab_tenants': 'Boutiques & Tenants Déployés',
    'superadmin.search_licenses': 'Rechercher par client, email, clé ou boutique...',
    'superadmin.filter_all': 'Tous',
    'superadmin.filter_plugins': 'Plugins',
    'superadmin.filter_themes': 'Thèmes',
    'superadmin.col_client': 'Client / Boutique',
    'superadmin.col_key': 'Clé de Licence',
    'superadmin.col_plan': 'Offre / Prix',
    'superadmin.col_validity': 'Validité / Expiration',
    'superadmin.col_status': 'Statut',
    'superadmin.col_actions': 'Actions',
    'superadmin.status_active': 'Active',
    'superadmin.status_expired': 'Expirée',
    'superadmin.status_suspended': 'Suspendue',
    'superadmin.lifetime': 'À vie (Lifetime)',
    'superadmin.edit': 'Modifier',
    'superadmin.extend': 'Prolonger',
    'superadmin.suspend': 'Suspendre',
    'superadmin.activate': 'Réactiver',
    'superadmin.delete': 'Supprimer',
    'superadmin.save': 'Enregistrer les Modifications',
    'superadmin.cancel': 'Annuler',

    // Storefront Header & Hero
    'store.deliver_to': 'Livrer à',
    'store.country_default': 'France (75001)',
    'store.all_departments': 'Tous les rayons',
    'store.search_placeholder': 'Rechercher dans la boutique...',
    'store.account_greeting': 'Bonjour, Identifiez-vous',
    'store.account_and_lists': 'Compte et Listes',
    'store.cart': 'Panier',
    'store.all_menu': 'Tout',
    'store.flash_deals_nav': 'Ventes Flash du Jour',
    'store.correos_badge': 'Livraison Express 24h',
    'store.manage_store_btn': '⚙️ Gérer la Boutique',

    // Hero banner & Countdown
    'store.hero_badge': 'VENTES FLASH DE LA SEMAINE — JUSQU\'À -45%',
    'store.hero_title': 'Les meilleurs produits Électronique, Maison et Tech avec Livraison Gratuite',
    'store.hero_desc': 'Garantie officielle 3 ans, paiement sécurisé via PayPal, Stripe, Contre-remboursement et livraison rapide.',
    'store.countdown_label': 'L\'offre se termine dans :',
    'store.free_shipping_notice': 'Livraison gratuite dès',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Vitrine des Produits Vedettes',
    'store.category_label': 'Rayon :',
    'store.showing_items': 'Articles en stock disponibles',
    'store.sort_by': 'Trier par :',
    'store.sort_featured': 'Recommandés / Meilleures ventes',
    'store.sort_price_low': 'Prix : croissant',
    'store.sort_price_high': 'Prix : décroissant',
    'store.sort_rating': 'Mieux notés',

    // Product Card
    'store.bestseller_badge': '#1 Meilleure Vente',
    'store.correos_shipping': 'Livraison Express avec Suivi',
    'store.add_to_cart': 'Ajouter au Panier',
    'store.buy_now': 'Acheter maintenant',

    // Product Details Modal
    'store.in_stock': '✓ En stock',
    'store.units_available': 'unités prêtes pour expédition immédiate',
    'store.brand': 'Marque :',
    'store.color': 'Couleur :',
    'store.warranty': 'Garantie :',
    'store.reviews_count': 'évaluations clients vérifiées',
    'store.buy_with_1click': 'Acheter en 1 Clic',

    // Cart Drawer
    'store.cart_title': 'Votre Panier d\'Achat',
    'store.free_shipping_achieved': '🎉 Félicitations ! Livraison GRATUITE activée',
    'store.free_shipping_progress': 'Ajoutez pour',
    'store.free_shipping_progress_tail': 'de plus pour la Livraison GRATUITE',
    'store.empty_cart': 'Votre panier est vide. Découvrez nos offres.',
    'store.subtotal': 'Sous-total',
    'store.checkout_cta': 'Passer la Commande',
    'store.clear_cart': 'Vider le Panier',

    // Checkout
    'checkout.title': 'Validation Sécurisée de la Commande',
    'checkout.step1': '1. Coordonnées et Adresse de Livraison',
    'checkout.step2': '2. Mode de Livraison',
    'checkout.step3': '3. Sélectionner le Mode de Paiement Sécurisé',
    'checkout.step4': '4. Récapitulatif de Commande',
    'checkout.full_name': 'Nom et Prénom',
    'checkout.email': 'Adresse Email',
    'checkout.address': 'Adresse Complète',
    'checkout.city': 'Ville',
    'checkout.postal_code': 'Code Postal',
    'checkout.country': 'Pays de Destination',
    'checkout.phone': 'Téléphone Portable (pour le suivi SMS)',
    'checkout.order_summary': 'Récapitulatif de Commande',
    'checkout.subtotal_label': 'Sous-total articles :',
    'checkout.shipping_label': 'Frais de livraison :',
    'checkout.free_shipping_val': 'GRATUIT',
    'checkout.cod_fee_label': 'Frais de contre-remboursement :',
    'checkout.tax_label': 'TVA incluse (21%) :',
    'checkout.total_label': 'Total à payer :',
    'checkout.place_order_btn': 'Confirmer et Payer la Commande',
    'checkout.processing_btn': 'Traitement sécurisé du paiement...',
    'checkout.success_title': 'Commande Validée avec Succès !',
    'checkout.order_number': 'Numéro de Commande :',
    'checkout.tracking_number': 'Numéro de Suivi Postal :',
    'checkout.continue_shopping': 'Poursuivre mes Achats',

    // Merchant Backoffice
    'merchant.title': 'Panneau d\'Administration CMS de la Boutique',
    'merchant.dashboard': 'Tableau de bord',
    'merchant.products': 'Produits',
    'merchant.orders': 'Commandes',
    'merchant.plugins': 'Plugins et Extensions',
    'merchant.themes': 'Thèmes et Apparence',
    'merchant.wp_import': 'Importateur Fenix All Import Pro',
    'merchant.languages': 'Langues et Traductions',
    'merchant.settings': 'Paramètres de la Boutique',
    'merchant.add_product': 'Ajouter un Produit',
  },

  de: {
    // Top Bar & Navigation
    'nav.environments': 'Umgebungen:',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Kunden-Shop',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Backend-Login',
    'nav.reset': 'Zurücksetzen',
    'nav.logout': 'Abmelden',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Käufer-Konto',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'SaaS-Inhaber-Leitstand: Verkauf von Plugins/Themes, Abopreise, Lizenzdauer und Multi-Tenancy.',
    'superadmin.active_session': 'Aktive Sitzung',
    'superadmin.emit_license': 'Lizenz Ausstellen',
    'superadmin.sell_addon': 'Add-on Verkaufen',
    'superadmin.view_commercial': 'Kommerzielles Portal Anzeigen',
    'superadmin.logout': 'Abmelden',
    'superadmin.kpi_mrr': 'GESCHÄTZTER MRR',
    'superadmin.kpi_mrr_sub': 'Monatlich wiederkehrend',
    'superadmin.kpi_active_lic': 'AKTIVE LIZENZEN',
    'superadmin.kpi_active_lic_sub': 'Gesamtlizenzen ausgestellt',
    'superadmin.kpi_addons': 'ADD-ONS IM VERKAUF',
    'superadmin.kpi_addons_sub': 'Plugins & Themes im Katalog',
    'superadmin.kpi_products': 'PRODUKTE IM NETZWERK',
    'superadmin.kpi_products_sub': 'In Firestore synchronisiert',
    'superadmin.tab_licenses': 'Lizenzen & Dauer',
    'superadmin.tab_plans': 'Tarif- & Preiskatalog',
    'superadmin.tab_marketplace': 'Marketplace Verkaufs-Add-ons',
    'superadmin.tab_tenants': 'Bereitgestellte Shops & Tenants',
    'superadmin.search_licenses': 'Nach Kunde, E-Mail, Schlüssel oder Shop suchen...',
    'superadmin.filter_all': 'Alle',
    'superadmin.filter_plugins': 'Plugins',
    'superadmin.filter_themes': 'Themes',
    'superadmin.col_client': 'Kunde / Shop',
    'superadmin.col_key': 'Lizenzschlüssel',
    'superadmin.col_plan': 'Tarif / Preis',
    'superadmin.col_validity': 'Gültigkeit / Ablauf',
    'superadmin.col_status': 'Status',
    'superadmin.col_actions': 'Aktionen',
    'superadmin.status_active': 'Aktiv',
    'superadmin.status_expired': 'Abgelaufen',
    'superadmin.status_suspended': 'Gesperrt',
    'superadmin.lifetime': 'Lebenslang (Lifetime)',
    'superadmin.edit': 'Bearbeiten',
    'superadmin.extend': 'Verlängern',
    'superadmin.suspend': 'Sperren',
    'superadmin.activate': 'Reaktivieren',
    'superadmin.delete': 'Löschen',
    'superadmin.save': 'Änderungen Speichern',
    'superadmin.cancel': 'Abbrechen',

    // Storefront Header & Hero
    'store.deliver_to': 'Liefern an',
    'store.country_default': 'Deutschland (10115)',
    'store.all_departments': 'Alle Abteilungen',
    'store.search_placeholder': 'Im Shop suchen...',
    'store.account_greeting': 'Hallo, Anmelden',
    'store.account_and_lists': 'Konto und Listen',
    'store.cart': 'Warenkorb',
    'store.all_menu': 'Alle',
    'store.flash_deals_nav': 'Heutige Blitzangebote',
    'store.correos_badge': '24h Express-Versand',
    'store.manage_store_btn': '⚙️ Shop Verwalten',

    // Hero banner & Countdown
    'store.hero_badge': 'BLITZANGEBOTE DER WOCHE — BIS ZU 45% RABATT',
    'store.hero_title': 'Die besten Elektronik-, Haushalts- und Tech-Produkte mit Gratisversand',
    'store.hero_desc': '3 Jahre Garantie, sichere Bezahlung mit PayPal, Stripe, Nachnahme und schneller Expressversand.',
    'store.countdown_label': 'Angebot endet in:',
    'store.free_shipping_notice': 'Kostenloser Versand ab',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Empfohlene Produkte',
    'store.category_label': 'Kategorie:',
    'store.showing_items': 'Verfügbare Lagerartikel',
    'store.sort_by': 'Sortieren nach:',
    'store.sort_featured': 'Empfohlen / Bestseller',
    'store.sort_price_low': 'Preis: aufsteigend',
    'store.sort_price_high': 'Preis: absteigend',
    'store.sort_rating': 'Beste Bewertungen',

    // Product Card
    'store.bestseller_badge': '#1 Bestseller',
    'store.correos_shipping': 'Express-Lieferung mit Sendungsverfolgung',
    'store.add_to_cart': 'In den Warenkorb',
    'store.buy_now': 'Jetzt kaufen',

    // Product Details Modal
    'store.in_stock': '✓ Auf Lager',
    'store.units_available': 'Stück sofort versandbereit',
    'store.brand': 'Marke:',
    'store.color': 'Farbe:',
    'store.warranty': 'Garantie:',
    'store.reviews_count': 'verifizierte Kundenbewertungen',
    'store.buy_with_1click': 'Mit 1-Klick Kaufen',

    // Cart Drawer
    'store.cart_title': 'Ihr Warenkorb',
    'store.free_shipping_achieved': '🎉 Glückwunsch! Sie erhalten KOSTENLOSEN Versand',
    'store.free_shipping_progress': 'Fügen Sie noch',
    'store.free_shipping_progress_tail': 'hinzu für KOSTENLOSEN Versand',
    'store.empty_cart': 'Ihr Warenkorb ist leer.',
    'store.subtotal': 'Zwischensumme',
    'store.checkout_cta': 'Zur Kasse',
    'store.clear_cart': 'Warenkorb leeren',

    // Checkout
    'checkout.title': 'Sichere Bestellung Abschließen',
    'checkout.step1': '1. Lieferadresse und Kontaktdaten',
    'checkout.step2': '2. Versandart',
    'checkout.step3': '3. Sichere Zahlungsmethode Wählen',
    'checkout.step4': '4. Bestellübersicht',
    'checkout.full_name': 'Vollständiger Name',
    'checkout.email': 'E-Mail-Adresse',
    'checkout.address': 'Vollständige Adresse',
    'checkout.city': 'Stadt',
    'checkout.postal_code': 'Postleitzahl',
    'checkout.country': 'Zielland',
    'checkout.phone': 'Mobilnummer (für SMS-Benachrichtigung)',
    'checkout.order_summary': 'Bestellübersicht',
    'checkout.subtotal_label': 'Zwischensumme Artikel:',
    'checkout.shipping_label': 'Versandkosten:',
    'checkout.free_shipping_val': 'GRATIS',
    'checkout.cod_fee_label': 'Nachnahmegebühr:',
    'checkout.tax_label': 'Inkl. 21% MwSt.:',
    'checkout.total_label': 'Gesamtbetrag:',
    'checkout.place_order_btn': 'Bestellung Bestätigen & Bezahlen',
    'checkout.processing_btn': 'Zahlung wird verarbeitet...',
    'checkout.success_title': 'Bestellung Erfolgreich Abgeschlossen!',
    'checkout.order_number': 'Bestellnummer:',
    'checkout.tracking_number': 'Sendungsnummer:',
    'checkout.continue_shopping': 'Weiter Einkaufen',

    // Merchant Backoffice
    'merchant.title': 'Händler-Verwaltungspanel',
    'merchant.dashboard': 'Dashboard',
    'merchant.products': 'Produkte',
    'merchant.orders': 'Bestellungen',
    'merchant.plugins': 'Plugins & Erweiterungen',
    'merchant.themes': 'Themes & Design',
    'merchant.wp_import': 'Fenix All Import Pro Importeur',
    'merchant.languages': 'Sprachen & Übersetzung',
    'merchant.settings': 'Shop-Einstellungen',
    'merchant.add_product': 'Produkt Hinzufügen',
  },

  pt: {
    // Top Bar & Navigation
    'nav.environments': 'Ambientes:',
    'nav.saas_core': 'SaaS Core',
    'nav.tenant_store': 'Loja Cliente',
    'nav.firestore_live': 'Firestore Live',
    'nav.login_backend': 'Login Backend',
    'nav.reset': 'Restaurar',
    'nav.logout': 'Sair',
    'nav.badge_saas_home': 'SaaS Home',
    'nav.badge_super_admin': 'Super Admin',
    'nav.badge_merchant_login': 'Merchant Login',
    'nav.badge_fenix_store': 'Fenix Store',
    'nav.badge_backoffice': 'Backoffice CMS',
    'nav.badge_shopper_account': 'Conta de Comprador',

    // Super Admin Portal
    'superadmin.title': 'Super Admin Console — FenixCMS (fenixcms.es/admin)',
    'superadmin.subtitle': 'Painel de controlo do proprietário SaaS: venda de plugins/temas, preços de subscrição, duração de licenças e multi-tenant.',
    'superadmin.active_session': 'Sessão ativa',
    'superadmin.emit_license': 'Emitir Licença',
    'superadmin.sell_addon': 'Vender Add-on',
    'superadmin.view_commercial': 'Ver Portal Comercial',
    'superadmin.logout': 'Sair',
    'superadmin.kpi_mrr': 'MRR ESTIMADO',
    'superadmin.kpi_mrr_sub': 'Recorrente mensal',
    'superadmin.kpi_active_lic': 'LICENÇAS ATIVAS',
    'superadmin.kpi_active_lic_sub': 'licenças totais emitidas',
    'superadmin.kpi_addons': 'ADD-ONS À VENDA',
    'superadmin.kpi_addons_sub': 'Plugins e temas em catálogo',
    'superadmin.kpi_products': 'PRODUTOS EM REDE',
    'superadmin.kpi_products_sub': 'Sincronizados no Firestore',
    'superadmin.tab_licenses': 'Licenças & Duração',
    'superadmin.tab_plans': 'Catálogo de Planos & Preços',
    'superadmin.tab_marketplace': 'Marketplace Add-ons à Venda',
    'superadmin.tab_tenants': 'Lojas & Tenants Implementados',
    'superadmin.search_licenses': 'Pesquisar por cliente, email, chave ou loja...',
    'superadmin.filter_all': 'Todos',
    'superadmin.filter_plugins': 'Plugins',
    'superadmin.filter_themes': 'Temas',
    'superadmin.col_client': 'Cliente / Loja',
    'superadmin.col_key': 'Chave de Licença',
    'superadmin.col_plan': 'Plano / Preço',
    'superadmin.col_validity': 'Validade / Expiração',
    'superadmin.col_status': 'Estado',
    'superadmin.col_actions': 'Ações',
    'superadmin.status_active': 'Ativa',
    'superadmin.status_expired': 'Expirada',
    'superadmin.status_suspended': 'Suspensa',
    'superadmin.lifetime': 'Vitalícia (Lifetime)',
    'superadmin.edit': 'Editar',
    'superadmin.extend': 'Estender',
    'superadmin.suspend': 'Suspender',
    'superadmin.activate': 'Reativar',
    'superadmin.delete': 'Eliminar',
    'superadmin.save': 'Guardar Alterações',
    'superadmin.cancel': 'Cancelar',

    // Storefront Header & Hero
    'store.deliver_to': 'Enviar para',
    'store.country_default': 'Portugal (1000-001)',
    'store.all_departments': 'Todos os departamentos',
    'store.search_placeholder': 'Pesquisar na loja...',
    'store.account_greeting': 'Olá, Iniciar Sessão',
    'store.account_and_lists': 'Conta e Encomendas',
    'store.cart': 'Carrinho',
    'store.all_menu': 'Tudo',
    'store.flash_deals_nav': 'Ofertas Relâmpago de Hoje',
    'store.correos_badge': 'Envio Expresso 24h',
    'store.manage_store_btn': '⚙️ Gerir Loja',

    // Hero banner & Countdown
    'store.hero_badge': 'OFERTAS RELÂMPAGO DA SEMANA — ATÉ 45% DESCONTO',
    'store.hero_title': 'Os melhores produtos de Eletrónica, Casa e Tecnologia com Envio Grátis',
    'store.hero_desc': 'Garantia oficial de 3 anos, pagamento seguro via PayPal, Stripe, Cobrança e entrega rápida via Correos Express.',
    'store.countdown_label': 'A oferta termina em:',
    'store.free_shipping_notice': 'Envio grátis em encomendas superiores a',

    // Catalog & Sorting
    'store.featured_catalog_title': 'Montra de Produtos em Destaque',
    'store.category_label': 'Categoria:',
    'store.showing_items': 'A mostrar artigos disponíveis em stock',
    'store.sort_by': 'Ordenar por:',
    'store.sort_featured': 'Recomendados / Mais vendidos',
    'store.sort_price_low': 'Preço: mais baixo primeiro',
    'store.sort_price_high': 'Preço: mais alto primeiro',
    'store.sort_rating': 'Melhor avaliados',

    // Product Card
    'store.bestseller_badge': '#1 Mais Vendido',
    'store.correos_shipping': 'Envio com Correos Express',
    'store.add_to_cart': 'Adicionar ao Carrinho',
    'store.buy_now': 'Comprar Já',

    // Product Details Modal
    'store.in_stock': '✓ Em stock',
    'store.units_available': 'unidades disponíveis para envio imediato',
    'store.brand': 'Marca:',
    'store.color': 'Cor:',
    'store.warranty': 'Garantia:',
    'store.reviews_count': 'avaliações verificadas de clientes',
    'store.buy_with_1click': 'Comprar com 1 Clique',

    // Cart Drawer
    'store.cart_title': 'O Seu Carrinho de Compras',
    'store.free_shipping_achieved': '🎉 Parabéns! Tem Envio GRÁTIS com Correos Express',
    'store.free_shipping_progress': 'Adicione mais',
    'store.free_shipping_progress_tail': 'para ter Envio GRÁTIS',
    'store.empty_cart': 'O seu carrinho está vazio. Conheça as nossas ofertas.',
    'store.subtotal': 'Subtotal',
    'store.checkout_cta': 'Finalizar Encomenda',
    'store.clear_cart': 'Esvaziar Carrinho',

    // Checkout
    'checkout.title': 'Finalizar Compra Segura',
    'checkout.step1': '1. Dados de Envio e Contacto',
    'checkout.step2': '2. Opção de Envio Correos Express',
    'checkout.step3': '3. Selecionar Método de Pagamento Seguro',
    'checkout.step4': '4. Resumo da Encomenda',
    'checkout.full_name': 'Nome Completo',
    'checkout.email': 'Email',
    'checkout.address': 'Morada Completa',
    'checkout.city': 'Cidade',
    'checkout.postal_code': 'Código Postal',
    'checkout.country': 'País de Destino',
    'checkout.phone': 'Telemóvel (para SMS de entrega)',
    'checkout.order_summary': 'Resumo da Encomenda',
    'checkout.subtotal_label': 'Subtotal produtos:',
    'checkout.shipping_label': 'Custos de envio:',
    'checkout.free_shipping_val': 'GRATIS',
    'checkout.cod_fee_label': 'Taxa de contra-reembolso:',
    'checkout.tax_label': 'IVA (21% incluído):',
    'checkout.total_label': 'Total a pagar:',
    'checkout.place_order_btn': 'Confirmar e Pagar Encomenda',
    'checkout.processing_btn': 'A processar pagamento seguro...',
    'checkout.success_title': 'Encomenda Realizada com Sucesso!',
    'checkout.order_number': 'Número de Encomenda:',
    'checkout.tracking_number': 'Código de Rastreio Correos:',
    'checkout.continue_shopping': 'Continuar a Comprar',

    // Merchant Backoffice
    'merchant.title': 'Painel de Controlo da Loja',
    'merchant.dashboard': 'Painel Principal',
    'merchant.products': 'Produtos',
    'merchant.orders': 'Encomendas',
    'merchant.plugins': 'Plugins & Extensões',
    'merchant.themes': 'Temas & Aspeto',
    'merchant.wp_import': 'Importador Fenix All Import Pro',
    'merchant.languages': 'Idiomas & Tradução',
    'merchant.settings': 'Definições da Loja',
    'merchant.add_product': 'Adicionar Produto',
  }
};

export function getTranslation(locale: SupportedLocale, key: string, fallback?: string): string {
  const dict = DICTIONARY[locale] || DICTIONARY.es;
  return dict[key] || DICTIONARY.es[key] || fallback || key;
}

export function getProductTitle(product: ProductItem, locale: SupportedLocale): string {
  if (!product) return '';
  // Check product translation field
  if (product.translations?.[locale]?.title) {
    return product.translations[locale]!.title;
  }
  // Check global product translation catalogue
  if (PRODUCT_TRANSLATIONS_CATALOG[product.id]?.[locale]?.title) {
    return PRODUCT_TRANSLATIONS_CATALOG[product.id][locale].title;
  }
  return product.title;
}

export function getProductDescription(product: ProductItem, locale: SupportedLocale): string {
  if (!product) return '';
  // Check product translation field
  if (product.translations?.[locale]?.description) {
    return product.translations[locale]!.description;
  }
  // Check global product translation catalogue
  if (PRODUCT_TRANSLATIONS_CATALOG[product.id]?.[locale]?.description) {
    return PRODUCT_TRANSLATIONS_CATALOG[product.id][locale].description;
  }
  return product.description;
}

export function getProductCategory(category: string, locale: SupportedLocale): string {
  if (!category) return '';
  if (CATEGORY_TRANSLATIONS[category]?.[locale]) {
    return CATEGORY_TRANSLATIONS[category][locale];
  }
  return category;
}

export function getProductAttribute(productId: string, attrKey: string, defaultValue: string, locale: SupportedLocale): string {
  if (PRODUCT_TRANSLATIONS_CATALOG[productId]?.[locale]?.attributes?.[attrKey]) {
    return PRODUCT_TRANSLATIONS_CATALOG[productId][locale].attributes![attrKey];
  }
  return defaultValue;
}
