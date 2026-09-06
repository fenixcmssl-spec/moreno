import { AuditService } from './audit.service';

export interface ClassifiedAdItem {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  location: string;
  city: string;
  images: string[];
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'SOLD' | 'EXPIRED' | 'REJECTED';
  featured: boolean;
  phone?: string;
  contactEmail?: string;
  attributes?: Record<string, any>;
  favoritesCount: number;
  viewsCount: number;
  createdAt: string;
}

export interface ClassifiedCategoryItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

const CLASSIFIED_ADS: ClassifiedAdItem[] = [
  {
    id: 'ad_1',
    tenantId: 'tenant_1',
    categoryId: 'clcat_motor',
    categoryName: 'Motor & Vehículos',
    sellerId: 'usr_seller_1',
    sellerName: 'Marcos Automoción',
    sellerRating: 4.9,
    title: 'Volkswagen Golf 2.0 TDI R-Line 2023 - Impecable',
    slug: 'volkswagen-golf-2-0-tdi-rline-2023',
    description: 'Vehículo nacional con solo 24.000 km, historial completo en servicio oficial, techo panorámico, cockpit digital, cambio DSG y garantía de 12 meses.',
    price: 26800,
    location: 'Madrid Centro (Madrid)',
    city: 'Madrid',
    images: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'PUBLISHED',
    featured: true,
    phone: '+34 611 223 344',
    contactEmail: 'marcos@automocion.es',
    attributes: { 'Año': '2023', 'Combustible': 'Diésel', 'Kilómetros': '24.000 km', 'Cambio': 'Automático' },
    favoritesCount: 18,
    viewsCount: 340,
    createdAt: '2026-08-25T11:00:00Z'
  },
  {
    id: 'ad_2',
    tenantId: 'tenant_1',
    categoryId: 'clcat_realestate',
    categoryName: 'Inmobiliaria',
    sellerId: 'usr_seller_2',
    sellerName: 'Elena V.',
    sellerRating: 5.0,
    title: 'Ático luminoso con terraza de 45m2 en Poblenou',
    slug: 'atico-luminoso-terraza-poblenou',
    description: 'Precioso ático reformado con 2 habitaciones dobles, salón con cocina abierta, suelos de parquet y amplia terraza orientada al mar.',
    price: 385000,
    location: 'Poblenou (Barcelona)',
    city: 'Barcelona',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'PUBLISHED',
    featured: true,
    phone: '+34 622 334 455',
    contactEmail: 'elena@inmopoblenou.cat',
    attributes: { 'Superficie': '95 m²', 'Habitaciones': '2', 'Baños': '1', 'Planta': 'Ático con ascensor' },
    favoritesCount: 42,
    viewsCount: 680,
    createdAt: '2026-08-27T16:00:00Z'
  }
];

const CLASSIFIED_CATEGORIES: ClassifiedCategoryItem[] = [
  { id: 'clcat_motor', tenantId: 'tenant_1', name: 'Motor & Vehículos', slug: 'motor', icon: 'Car', count: 1 },
  { id: 'clcat_realestate', tenantId: 'tenant_1', name: 'Inmobiliaria', slug: 'inmobiliaria', icon: 'Home', count: 1 },
  { id: 'clcat_tech', tenantId: 'tenant_1', name: 'Tecnología & Móviles', slug: 'tecnologia', icon: 'Smartphone', count: 0 },
  { id: 'clcat_home', tenantId: 'tenant_1', name: 'Hogar & Jardín', slug: 'hogar', icon: 'Sofa', count: 0 }
];

export class ClassifiedService {
  static getAds(tenantId: string): ClassifiedAdItem[] {
    return CLASSIFIED_ADS.filter(a => a.tenantId === tenantId);
  }

  static getAdBySlug(tenantId: string, slug: string): ClassifiedAdItem | undefined {
    return CLASSIFIED_ADS.find(a => a.tenantId === tenantId && a.slug === slug);
  }

  static getCategories(tenantId: string): ClassifiedCategoryItem[] {
    return CLASSIFIED_CATEGORIES.filter(c => c.tenantId === tenantId);
  }

  static createAd(tenantId: string, ad: Omit<ClassifiedAdItem, 'id' | 'tenantId' | 'favoritesCount' | 'viewsCount' | 'createdAt'>): ClassifiedAdItem {
    const newAd: ClassifiedAdItem = {
      ...ad,
      id: `ad_${Date.now()}`,
      tenantId,
      favoritesCount: 0,
      viewsCount: 0,
      createdAt: new Date().toISOString()
    };
    CLASSIFIED_ADS.unshift(newAd);

    AuditService.log({
      tenantId,
      action: 'CLASSIFIED_AD_CREATED',
      entity: 'ClassifiedAd',
      entityId: newAd.id,
      details: { title: newAd.title, price: newAd.price }
    });

    return newAd;
  }

  static updateAdStatus(tenantId: string, adId: string, status: ClassifiedAdItem['status']): boolean {
    const ad = CLASSIFIED_ADS.find(a => a.id === adId && a.tenantId === tenantId);
    if (!ad) return false;
    ad.status = status;

    AuditService.log({
      tenantId,
      action: 'CLASSIFIED_AD_MODERATED',
      entity: 'ClassifiedAd',
      entityId: adId,
      details: { newStatus: status }
    });

    return true;
  }
}
