import { prisma } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { SecurityService } from '../security/security.service';
import { ContentStatus } from '@prisma/client';

export interface ClassifiedAdRecord {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  categoryId?: string | null;
  price: number;
  location: string;
  city?: string | null;
  images: string[];
  status: ContentStatus;
  featured: boolean;
  sellerId?: string | null;
  sellerName: string;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  sellerRating?: number;
  attributes?: Record<string, any>;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}

// Backward compatibility alias for UI and storefront
export type ClassifiedAdItem = ClassifiedAdRecord;

export interface ClassifiedCategoryItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

export interface CreateClassifiedAdInput {
  title: string;
  slug?: string;
  description: string;
  category?: string;
  categoryId?: string;
  price: number;
  location?: string;
  city?: string;
  images?: string[];
  featured?: boolean;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  attributes?: Record<string, any>;
  status?: ContentStatus | string;
}

export interface UpdateClassifiedAdInput {
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  categoryId?: string;
  price?: number;
  location?: string;
  city?: string;
  images?: string[];
  featured?: boolean;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  attributes?: Record<string, any>;
  status?: ContentStatus | string;
}

export interface ClassifiedQueryOptions {
  status?: ContentStatus | string | 'ALL';
  category?: string;
  city?: string;
  search?: string;
  sellerId?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  skip?: number;
  take?: number;
  allowUnpublished?: boolean;
}

export interface ActorContext {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeStatus(raw?: string | ContentStatus): ContentStatus {
  if (!raw) return ContentStatus.PUBLISHED;
  const upper = String(raw).toUpperCase();
  if (upper === 'DRAFT') return ContentStatus.DRAFT;
  if (upper === 'PENDING') return ContentStatus.PENDING;
  if (upper === 'REJECTED') return ContentStatus.REJECTED;
  if (upper === 'SOLD') return ContentStatus.SOLD;
  if (upper === 'ARCHIVED') return ContentStatus.ARCHIVED;
  return ContentStatus.PUBLISHED;
}

function sanitizeText(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return SecurityService.sanitizeString(raw);
}

function mapDbToClassifiedAd(dbAd: any): ClassifiedAdRecord {
  return {
    id: dbAd.id,
    tenantId: dbAd.tenantId,
    title: dbAd.title,
    slug: dbAd.slug,
    description: dbAd.description || '',
    category: dbAd.category || 'General',
    categoryId: dbAd.categoryId || null,
    price: Number(dbAd.price) || 0,
    location: dbAd.location || '',
    city: dbAd.city || null,
    images: Array.isArray(dbAd.images) ? dbAd.images : [],
    status: dbAd.status,
    featured: Boolean(dbAd.featured),
    sellerId: dbAd.sellerId || null,
    sellerName: dbAd.sellerName || 'Vendedor',
    sellerPhone: dbAd.sellerPhone || null,
    sellerEmail: dbAd.sellerEmail || null,
    sellerRating: 5.0,
    attributes: (dbAd.attributes && typeof dbAd.attributes === 'object') ? dbAd.attributes : {},
    viewsCount: Number(dbAd.viewsCount) || 0,
    favoritesCount: Number(dbAd.favoritesCount) || 0,
    createdAt: dbAd.createdAt instanceof Date ? dbAd.createdAt.toISOString() : String(dbAd.createdAt),
    updatedAt: dbAd.updatedAt instanceof Date ? dbAd.updatedAt.toISOString() : String(dbAd.updatedAt)
  };
}

export class ClassifiedService {
  /**
   * List classified ads with strict tenant isolation, PostgreSQL query filters and pagination
   */
  static async getAds(
    tenantId: string,
    options?: ClassifiedQueryOptions
  ): Promise<{ ads: ClassifiedAdRecord[]; total: number }> {
    if (!tenantId) throw new Error('Tenant ID is required');

    const whereClause: any = { tenantId };

    if (options?.status && options.status !== 'ALL') {
      whereClause.status = normalizeStatus(options.status);
    } else if (!options?.allowUnpublished && (!options?.status || options.status !== 'ALL')) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    if (options?.category && options.category.trim().length > 0) {
      whereClause.category = options.category.trim();
    }

    if (options?.city && options.city.trim().length > 0) {
      whereClause.city = { contains: options.city.trim(), mode: 'insensitive' };
    }

    if (options?.sellerId) {
      whereClause.sellerId = options.sellerId;
    }

    if (options?.featured !== undefined) {
      whereClause.featured = options.featured;
    }

    if (options?.minPrice !== undefined || options?.maxPrice !== undefined) {
      whereClause.price = {};
      if (options.minPrice !== undefined) whereClause.price.gte = Number(options.minPrice);
      if (options.maxPrice !== undefined) whereClause.price.lte = Number(options.maxPrice);
    }

    if (options?.search && options.search.trim().length > 0) {
      const q = options.search.trim();
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } }
      ];
    }

    const take = Math.min(Math.max(1, options?.take ?? 50), 100);
    const skip = Math.max(0, options?.skip ?? 0);

    const [dbAds, total] = await Promise.all([
      prisma.classifiedAd.findMany({
        where: whereClause,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take
      }),
      prisma.classifiedAd.count({ where: whereClause })
    ]);

    return {
      ads: dbAds.map(mapDbToClassifiedAd),
      total
    };
  }

  /**
   * Public storefront ads query: strictly scoped by tenant and approved/published
   */
  static async getPublicAds(
    tenantId: string,
    options?: ClassifiedQueryOptions
  ): Promise<{ ads: ClassifiedAdRecord[]; total: number }> {
    return this.getAds(tenantId, {
      ...options,
      status: ContentStatus.PUBLISHED,
      allowUnpublished: false
    });
  }

  /**
   * Find ad by slug strictly scoped by tenantId
   */
  static async getAdBySlug(
    tenantId: string,
    slug: string,
    allowUnpublished = false
  ): Promise<ClassifiedAdRecord | null> {
    if (!tenantId || !slug) return null;

    const normalized = normalizeSlug(slug);
    const whereClause: any = {
      tenantId,
      slug: normalized
    };

    if (!allowUnpublished) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    const dbAd = await prisma.classifiedAd.findFirst({
      where: whereClause
    });

    if (!dbAd) return null;

    // Increment views count asynchronously in background
    prisma.classifiedAd.update({
      where: { id: dbAd.id },
      data: { viewsCount: { increment: 1 } }
    }).catch(err => console.warn('Failed to increment viewsCount on ClassifiedAd:', err));

    return mapDbToClassifiedAd(dbAd);
  }

  /**
   * Find ad by ID strictly scoped by tenantId
   */
  static async getAdById(
    tenantId: string,
    adId: string
  ): Promise<ClassifiedAdRecord | null> {
    if (!tenantId || !adId) return null;

    const dbAd = await prisma.classifiedAd.findFirst({
      where: { id: adId, tenantId }
    });

    return dbAd ? mapDbToClassifiedAd(dbAd) : null;
  }

  /**
   * Create a new classified ad with server-side validation, ownership assignment, and audit logging
   */
  static async createAd(
    tenantId: string,
    input: CreateClassifiedAdInput,
    actor?: ActorContext
  ): Promise<ClassifiedAdRecord> {
    if (!tenantId) throw new Error('Tenant ID is required');

    const sanitizedTitle = sanitizeText(input.title);
    if (!sanitizedTitle || sanitizedTitle.length < 3) {
      throw new Error('El título debe tener al menos 3 caracteres');
    }

    const price = Number(input.price);
    if (isNaN(price) || !isFinite(price) || price < 0) {
      throw new Error('El precio debe ser un número positivo válido');
    }

    const sanitizedDesc = sanitizeText(input.description);
    const sanitizedLocation = sanitizeText(input.location || 'España');
    const sanitizedCity = sanitizeText(input.city || input.location || 'Madrid');
    const sanitizedCategory = sanitizeText(input.category || 'General');
    const sanitizedSellerName = sanitizeText(input.sellerName || actor?.name || 'Vendedor');

    // Slug generation and tenant collision avoidance
    let baseSlug = input.slug ? normalizeSlug(input.slug) : normalizeSlug(sanitizedTitle);
    if (!baseSlug) baseSlug = `anuncio-${Date.now()}`;

    let finalSlug = baseSlug;
    let collisionCount = 1;
    while (true) {
      const existing = await prisma.classifiedAd.findUnique({
        where: { tenantId_slug: { tenantId, slug: finalSlug } }
      });
      if (!existing) break;
      finalSlug = `${baseSlug}-${++collisionCount}`;
    }

    // Role-based Status & Moderation validation
    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin;
    let initialStatus: ContentStatus = ContentStatus.PUBLISHED;

    if (input.status) {
      const requestedStatus = normalizeStatus(input.status);
      if (isAdmin) {
        initialStatus = requestedStatus;
      } else {
        // Non-admin sellers can only submit as PENDING (or DRAFT)
        if (requestedStatus === ContentStatus.DRAFT) {
          initialStatus = ContentStatus.DRAFT;
        } else {
          initialStatus = ContentStatus.PENDING;
        }
      }
    }

    // Media validation: sanitize image URLs
    const sanitizedImages = Array.isArray(input.images)
      ? input.images.map(img => SecurityService.sanitizeString(String(img).trim())).filter(Boolean)
      : [];

    if (sanitizedImages.length === 0) {
      sanitizedImages.push('https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80');
    }

    // Derive sellerId strictly from authenticated session
    const sellerId = actor?.userId || null;

    const dbAd = await prisma.classifiedAd.create({
      data: {
        tenantId,
        title: sanitizedTitle,
        slug: finalSlug,
        description: sanitizedDesc,
        category: sanitizedCategory,
        categoryId: input.categoryId ? sanitizeText(input.categoryId) : null,
        price,
        location: sanitizedLocation,
        city: sanitizedCity,
        images: sanitizedImages,
        status: initialStatus,
        featured: isAdmin ? Boolean(input.featured) : false,
        sellerId,
        sellerName: sanitizedSellerName,
        sellerPhone: input.sellerPhone ? sanitizeText(input.sellerPhone) : null,
        sellerEmail: input.sellerEmail ? sanitizeText(input.sellerEmail) : (actor?.email || null),
        attributes: input.attributes && typeof input.attributes === 'object' ? input.attributes : {},
        viewsCount: 0,
        favoritesCount: 0
      }
    });

    AuditService.log({
      tenantId,
      userId: actor?.userId,
      userEmail: actor?.email,
      action: 'CLASSIFIED_AD_CREATED',
      entity: 'ClassifiedAd',
      entityId: dbAd.id,
      details: { title: dbAd.title, slug: dbAd.slug, price: dbAd.price, status: dbAd.status }
    });

    return mapDbToClassifiedAd(dbAd);
  }

  /**
   * Update classified ad with ownership check, input validation, and audit logging
   */
  static async updateAd(
    tenantId: string,
    adId: string,
    input: UpdateClassifiedAdInput,
    actor?: ActorContext
  ): Promise<ClassifiedAdRecord> {
    if (!tenantId || !adId) throw new Error('Tenant ID and Ad ID are required');

    const existing = await prisma.classifiedAd.findFirst({
      where: { id: adId, tenantId }
    });

    if (!existing) {
      throw new Error('Anuncio clasificado no encontrado');
    }

    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin;

    // Enforce ownership: Non-admins can only update their own ads
    if (!isAdmin) {
      if (!actor?.userId || existing.sellerId !== actor.userId) {
        throw new Error('No tienes permisos para modificar este anuncio');
      }
    }

    const updateData: any = {};

    if (input.title !== undefined) {
      const sanitizedTitle = sanitizeText(input.title);
      if (!sanitizedTitle || sanitizedTitle.length < 3) {
        throw new Error('El título debe tener al menos 3 caracteres');
      }
      updateData.title = sanitizedTitle;
    }

    if (input.price !== undefined) {
      const price = Number(input.price);
      if (isNaN(price) || !isFinite(price) || price < 0) {
        throw new Error('El precio debe ser un número positivo válido');
      }
      updateData.price = price;
    }

    if (input.description !== undefined) {
      updateData.description = sanitizeText(input.description);
    }

    if (input.category !== undefined) {
      updateData.category = sanitizeText(input.category);
    }

    if (input.categoryId !== undefined) {
      updateData.categoryId = sanitizeText(input.categoryId);
    }

    if (input.location !== undefined) {
      updateData.location = sanitizeText(input.location);
    }

    if (input.city !== undefined) {
      updateData.city = sanitizeText(input.city);
    }

    if (input.sellerPhone !== undefined) {
      updateData.sellerPhone = sanitizeText(input.sellerPhone);
    }

    if (input.sellerEmail !== undefined) {
      updateData.sellerEmail = sanitizeText(input.sellerEmail);
    }

    if (input.attributes !== undefined && typeof input.attributes === 'object') {
      updateData.attributes = input.attributes;
    }

    if (Array.isArray(input.images)) {
      updateData.images = input.images.map(img => SecurityService.sanitizeString(String(img).trim())).filter(Boolean);
    }

    if (isAdmin && input.featured !== undefined) {
      updateData.featured = Boolean(input.featured);
    }

    // Status management: Non-admin can set to DRAFT or SOLD, but cannot approve/publish directly
    if (input.status !== undefined) {
      const normalized = normalizeStatus(input.status);
      if (isAdmin) {
        updateData.status = normalized;
      } else {
        if (normalized === ContentStatus.DRAFT || normalized === ContentStatus.SOLD) {
          updateData.status = normalized;
        } else if (normalized === ContentStatus.PUBLISHED) {
          updateData.status = ContentStatus.PENDING;
        }
      }
    }

    if (input.slug) {
      const newSlug = normalizeSlug(input.slug);
      if (newSlug !== existing.slug) {
        const slugExists = await prisma.classifiedAd.findUnique({
          where: { tenantId_slug: { tenantId, slug: newSlug } }
        });
        if (slugExists && slugExists.id !== adId) {
          throw new Error('El slug indicado ya está en uso en esta tienda');
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.classifiedAd.update({
      where: { id: adId },
      data: updateData
    });

    AuditService.log({
      tenantId,
      userId: actor?.userId,
      userEmail: actor?.email,
      action: 'CLASSIFIED_AD_UPDATED',
      entity: 'ClassifiedAd',
      entityId: adId,
      details: { updatedFields: Object.keys(updateData), newStatus: updated.status }
    });

    return mapDbToClassifiedAd(updated);
  }

  /**
   * Update ad moderation status (Admin or authorized owner for marking SOLD/DRAFT)
   */
  static async updateAdStatus(
    tenantId: string,
    adId: string,
    status: ContentStatus | string,
    actor?: ActorContext
  ): Promise<ClassifiedAdRecord> {
    if (!tenantId || !adId) throw new Error('Tenant ID and Ad ID are required');

    const existing = await prisma.classifiedAd.findFirst({
      where: { id: adId, tenantId }
    });

    if (!existing) {
      throw new Error('Anuncio clasificado no encontrado');
    }

    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin;
    const normalized = normalizeStatus(status);

    if (!isAdmin) {
      if (!actor?.userId || existing.sellerId !== actor.userId) {
        throw new Error('No tienes permisos para cambiar el estado de este anuncio');
      }
      if (normalized === ContentStatus.PUBLISHED) {
        throw new Error('Solo los administradores o moderadores pueden aprobar publicaciones');
      }
    }

    const updated = await prisma.classifiedAd.update({
      where: { id: adId },
      data: { status: normalized }
    });

    AuditService.log({
      tenantId,
      userId: actor?.userId,
      userEmail: actor?.email,
      action: 'CLASSIFIED_AD_MODERATED',
      entity: 'ClassifiedAd',
      entityId: adId,
      details: { previousStatus: existing.status, newStatus: normalized }
    });

    return mapDbToClassifiedAd(updated);
  }

  /**
   * Delete classified ad with tenant isolation and ownership enforcement
   */
  static async deleteAd(
    tenantId: string,
    adId: string,
    actor?: ActorContext
  ): Promise<boolean> {
    if (!tenantId || !adId) throw new Error('Tenant ID and Ad ID are required');

    const existing = await prisma.classifiedAd.findFirst({
      where: { id: adId, tenantId }
    });

    if (!existing) {
      throw new Error('Anuncio clasificado no encontrado');
    }

    const isAdmin = actor?.role === 'ADMIN' || actor?.role === 'SUPER_ADMIN' || actor?.isSuperAdmin;

    if (!isAdmin) {
      if (!actor?.userId || existing.sellerId !== actor.userId) {
        throw new Error('No tienes permisos para eliminar este anuncio');
      }
    }

    await prisma.classifiedAd.delete({
      where: { id: adId }
    });

    AuditService.log({
      tenantId,
      userId: actor?.userId,
      userEmail: actor?.email,
      action: 'CLASSIFIED_AD_DELETED',
      entity: 'ClassifiedAd',
      entityId: adId,
      details: { title: existing.title, slug: existing.slug }
    });

    return true;
  }

  /**
   * Get dynamic distinct categories and ad counts from PostgreSQL for this tenant
   */
  static async getCategories(tenantId: string): Promise<ClassifiedCategoryItem[]> {
    if (!tenantId) return [];

    const dbCategories = await prisma.classifiedAd.groupBy({
      by: ['category'],
      where: { tenantId, status: ContentStatus.PUBLISHED },
      _count: { id: true }
    });

    return dbCategories.map((c, idx) => ({
      id: `cat_${idx + 1}`,
      tenantId,
      name: c.category || 'General',
      slug: normalizeSlug(c.category || 'general'),
      icon: 'Tag',
      count: c._count.id
    }));
  }
}
