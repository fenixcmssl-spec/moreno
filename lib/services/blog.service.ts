import { AuditService } from './audit.service';

export interface BlogPost {
  id: string;
  tenantId: string;
  categoryId?: string;
  categoryName?: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string;
  seoTitle?: string;
  seoDescription?: string;
  viewsCount: number;
  tags: string[];
  commentsCount: number;
  createdAt: string;
}

export interface BlogCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  postsCount: number;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 'post_1',
    tenantId: 'tenant_1',
    categoryId: 'bcat_trends',
    categoryName: 'Tendencias & Tecnología',
    authorName: 'Redacción Fénix',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    title: 'Top 10 innovaciones que revolucionarán el comercio electrónico en 2026',
    slug: 'top-10-innovaciones-ecommerce-2026',
    excerpt: 'Descubre cómo la IA generativa, el checkout biométrico y la logística ultrarrápida están transformando las ventas online.',
    content: 'El panorama digital está experimentando una transformación sin precedentes. Las plataformas SaaS de nueva generación permiten a los negocios escalar de forma modular...',
    featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    status: 'PUBLISHED',
    publishedAt: '2026-08-20T10:00:00Z',
    seoTitle: 'Tendencias E-commerce 2026 | Blog Fénix',
    seoDescription: 'Análisis de las mejores innovaciones tecnológicas para tiendas online en 2026.',
    viewsCount: 1420,
    tags: ['E-commerce', 'IA', 'SaaS', 'Logística'],
    commentsCount: 5,
    createdAt: '2026-08-20T09:00:00Z'
  },
  {
    id: 'post_2',
    tenantId: 'tenant_1',
    categoryId: 'bcat_guides',
    categoryName: 'Guías de Negocio',
    authorName: 'Carlos Mendoza',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    title: 'Cómo optimizar la pasarela de pagos para reducir la tasa de abandono',
    slug: 'optimizar-pasarela-de-pagos-reducir-abandono',
    excerpt: 'Claves para integrar Bizum, Redsys, Stripe y PayPal ofreciendo una experiencia de compra fluida y sin fricciones.',
    content: 'Uno de los puntos críticos de conversión es el proceso de pago. Contar con múltiples métodos locales como Bizum e internacionales como PayPal asegura la máxima confianza...',
    featuredImage: 'https://images.unsplash.com/photo-1556742049-0a67e557b683?w=800&auto=format&fit=crop&q=80',
    status: 'PUBLISHED',
    publishedAt: '2026-08-28T14:30:00Z',
    seoTitle: 'Optimización de Pagos y Conversión | Fénix Blog',
    seoDescription: 'Guía práctica para reducir el abandono de carrito con pasarelas modernas.',
    viewsCount: 890,
    tags: ['Pagos', 'Bizum', 'Conversión'],
    commentsCount: 2,
    createdAt: '2026-08-28T12:00:00Z'
  }
];

const BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'bcat_trends', tenantId: 'tenant_1', name: 'Tendencias & Tecnología', slug: 'tendencias-tecnologia', postsCount: 1 },
  { id: 'bcat_guides', tenantId: 'tenant_1', name: 'Guías de Negocio', slug: 'guias-negocio', postsCount: 1 },
  { id: 'bcat_news', tenantId: 'tenant_1', name: 'Noticias Corporativas', slug: 'noticias-corporativas', postsCount: 0 }
];

export class BlogService {
  static getPosts(tenantId: string): BlogPost[] {
    return BLOG_POSTS.filter(p => p.tenantId === tenantId);
  }

  static getPostBySlug(tenantId: string, slug: string): BlogPost | undefined {
    return BLOG_POSTS.find(p => p.tenantId === tenantId && p.slug === slug);
  }

  static getCategories(tenantId: string): BlogCategory[] {
    return BLOG_CATEGORIES.filter(c => c.tenantId === tenantId);
  }

  static createPost(tenantId: string, post: Omit<BlogPost, 'id' | 'tenantId' | 'viewsCount' | 'commentsCount' | 'createdAt'>): BlogPost {
    const newPost: BlogPost = {
      ...post,
      id: `post_${Date.now()}`,
      tenantId,
      viewsCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString()
    };
    BLOG_POSTS.unshift(newPost);

    AuditService.log({
      tenantId,
      action: 'BLOG_POST_CREATED',
      entity: 'Post',
      entityId: newPost.id,
      details: { title: newPost.title, status: newPost.status }
    });

    return newPost;
  }

  static updatePost(tenantId: string, id: string, updates: Partial<BlogPost>): BlogPost | null {
    const index = BLOG_POSTS.findIndex(p => p.id === id && p.tenantId === tenantId);
    if (index === -1) return null;
    BLOG_POSTS[index] = { ...BLOG_POSTS[index], ...updates };
    return BLOG_POSTS[index];
  }

  static deletePost(tenantId: string, id: string): boolean {
    const index = BLOG_POSTS.findIndex(p => p.id === id && p.tenantId === tenantId);
    if (index === -1) return false;
    BLOG_POSTS.splice(index, 1);
    return true;
  }
}
