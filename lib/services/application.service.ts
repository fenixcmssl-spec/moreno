import { ApplicationDefinition, ApplicationTypeKey } from '@/types';

export const INITIAL_APPLICATIONS: ApplicationDefinition[] = [
  {
    id: 'app_ecommerce',
    key: 'ECOMMERCE',
    name: 'Fenix E-commerce Pro',
    slug: 'ecommerce',
    description: 'Plataforma completa de venta online con catálogo, variantes, carrito, pasarelas de pago, envíos y facturación.',
    status: 'ACTIVE',
    icon: 'ShoppingCart',
    version: '2.4.0',
    modules: [
      { id: 'mod_ec_1', applicationId: 'app_ecommerce', key: 'products', name: 'Catálogo de Productos', isDefault: true },
      { id: 'mod_ec_2', applicationId: 'app_ecommerce', key: 'orders', name: 'Gestión de Pedidos & Envíos', isDefault: true },
      { id: 'mod_ec_3', applicationId: 'app_ecommerce', key: 'coupons', name: 'Cupones & Promociones', isDefault: true },
      { id: 'mod_ec_4', applicationId: 'app_ecommerce', key: 'gateways', name: 'Pasarelas de Pago Multi-Moneda', isDefault: true },
      { id: 'mod_ec_5', applicationId: 'app_ecommerce', key: 'import_pro', name: 'Fenix All Import Pro (WooCommerce/CSV)', isDefault: true }
    ],
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'app_blog',
    key: 'BLOG',
    name: 'Fenix Blog & Magazine',
    slug: 'blog',
    description: 'Sistema editorial para publicaciones, revistas digitales, noticias con categorías, autores, SEO avanzado y comentarios.',
    status: 'ACTIVE',
    icon: 'Newspaper',
    version: '1.8.0',
    modules: [
      { id: 'mod_bl_1', applicationId: 'app_blog', key: 'posts', name: 'Entradas & Artículos', isDefault: true },
      { id: 'mod_bl_2', applicationId: 'app_blog', key: 'categories', name: 'Categorías y Etiquetas', isDefault: true },
      { id: 'mod_bl_3', applicationId: 'app_blog', key: 'authors', name: 'Gestión de Autores & Editores', isDefault: true },
      { id: 'mod_bl_4', applicationId: 'app_blog', key: 'comments', name: 'Moderación de Comentarios', isDefault: true }
    ],
    createdAt: '2026-01-10T00:00:00Z'
  },
  {
    id: 'app_classifieds',
    key: 'CLASSIFIEDS',
    name: 'Fenix Classifieds Portal',
    slug: 'clasificados',
    description: 'Portal de anuncios clasificados estilo Wallapop/Milanuncios con filtros por ubicación, chat, vendedores y anuncios destacados.',
    status: 'ACTIVE',
    icon: 'Tag',
    version: '1.5.0',
    modules: [
      { id: 'mod_cl_1', applicationId: 'app_classifieds', key: 'ads', name: 'Gestión de Anuncios', isDefault: true },
      { id: 'mod_cl_2', applicationId: 'app_classifieds', key: 'locations', name: 'Filtros por Ciudad & Geografía', isDefault: true },
      { id: 'mod_cl_3', applicationId: 'app_classifieds', key: 'moderation', name: 'Panel de Moderación', isDefault: true },
      { id: 'mod_cl_4', applicationId: 'app_classifieds', key: 'sellers', name: 'Perfiles de Vendedores', isDefault: true }
    ],
    createdAt: '2026-02-01T00:00:00Z'
  },
  {
    id: 'app_booking',
    key: 'BOOKING',
    name: 'Fenix Booking & Citas',
    slug: 'reservas',
    description: 'Sistema de reservas online y gestión de citas con sincronización de calendario, depósitos y recordatorios.',
    status: 'ACTIVE',
    icon: 'Calendar',
    version: '1.2.0',
    modules: [
      { id: 'mod_bk_1', applicationId: 'app_booking', key: 'calendars', name: 'Calendarios de Disponibilidad', isDefault: true },
      { id: 'mod_bk_2', applicationId: 'app_booking', key: 'services', name: 'Servicios & Tarifas', isDefault: true }
    ],
    createdAt: '2026-03-01T00:00:00Z'
  },
  {
    id: 'app_landing',
    key: 'LANDING',
    name: 'Fenix Landing & Corporate',
    slug: 'landing',
    description: 'Sitios corporativos y páginas de aterrizaje de alta conversión con bloques visuales y formularios de captación.',
    status: 'ACTIVE',
    icon: 'Layers',
    version: '2.0.0',
    modules: [
      { id: 'mod_ld_1', applicationId: 'app_landing', key: 'sections', name: 'Constructor de Bloques', isDefault: true },
      { id: 'mod_ld_2', applicationId: 'app_landing', key: 'leads', name: 'Captación de Leads', isDefault: true }
    ],
    createdAt: '2026-01-15T00:00:00Z'
  },
  {
    id: 'app_lms',
    key: 'LMS',
    name: 'Fenix Academy & Cursos',
    slug: 'cursos',
    description: 'Plataforma educativa para academias con cursos en vídeo, lecciones, cuestionarios y certificados.',
    status: 'ACTIVE',
    icon: 'GraduationCap',
    version: '1.0.0',
    modules: [
      { id: 'mod_lm_1', applicationId: 'app_lms', key: 'courses', name: 'Cursos & Módulos', isDefault: true },
      { id: 'mod_lm_2', applicationId: 'app_lms', key: 'students', name: 'Gestión de Alumnos', isDefault: true }
    ],
    createdAt: '2026-04-01T00:00:00Z'
  }
];

export class ApplicationService {
  private static apps: ApplicationDefinition[] = [...INITIAL_APPLICATIONS];

  static getAll(): ApplicationDefinition[] {
    return this.apps;
  }

  static getById(id: string): ApplicationDefinition | undefined {
    return this.apps.find(a => a.id === id);
  }

  static getByKey(key: ApplicationTypeKey): ApplicationDefinition | undefined {
    return this.apps.find(a => a.key === key);
  }

  static create(app: Omit<ApplicationDefinition, 'id' | 'createdAt'>): ApplicationDefinition {
    const newApp: ApplicationDefinition = {
      ...app,
      id: `app_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.apps.push(newApp);
    return newApp;
  }

  static update(id: string, updates: Partial<ApplicationDefinition>): ApplicationDefinition | null {
    const index = this.apps.findIndex(a => a.id === id);
    if (index === -1) return null;
    this.apps[index] = { ...this.apps[index], ...updates };
    return this.apps[index];
  }

  static toggleStatus(id: string): ApplicationDefinition | null {
    const app = this.apps.find(a => a.id === id);
    if (!app) return null;
    app.status = app.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return app;
  }
}
