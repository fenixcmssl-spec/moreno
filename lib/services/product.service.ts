import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { ProductItem } from '@/types';

export interface CreateProductInput {
  title: string;
  slug?: string;
  description?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stock?: number;
  sku?: string;
  barcode?: string;
  category?: string;
  categoryId?: string;
  images?: string[];
  featured?: boolean;
  isBestSeller?: boolean;
  isDeal?: boolean;
  dealDiscountPercent?: number;
  tags?: string[];
  attributes?: Record<string, any>;
  variants?: any[];
  translations?: Record<string, any>;
  status?: string;
}

export interface UpdateProductInput {
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  comparePrice?: number | null;
  costPrice?: number | null;
  stock?: number;
  sku?: string;
  barcode?: string | null;
  category?: string;
  categoryId?: string | null;
  images?: string[];
  featured?: boolean;
  isBestSeller?: boolean;
  isDeal?: boolean;
  dealDiscountPercent?: number | null;
  tags?: string[];
  attributes?: Record<string, any>;
  variants?: any[];
  translations?: Record<string, any>;
  status?: string;
}

export interface ProductListFilters {
  category?: string;
  categoryId?: string;
  search?: string;
  status?: string | string[];
  featured?: boolean;
  isDeal?: boolean;
  isBestSeller?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'price' | 'title' | 'stock' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export class ProductService {
  /**
   * Generates a robust, collision-resistant SKU for tenant
   */
  static generateSku(prefix: string = 'FNX'): string {
    const cleanPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'FNX';
    const randPart = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    return `${cleanPrefix}-${timePart}-${randPart}`;
  }

  /**
   * Generates a clean URL slug
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `prod-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * CREATE: Create a product in PostgreSQL via Prisma
   */
  static async createProduct(tenantId: string, input: CreateProductInput): Promise<ProductItem> {
    if (!tenantId) {
      throw new Error('Tenant ID es requerido para crear un producto');
    }
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('El título del producto es obligatorio');
    }
    if (input.price === undefined || input.price === null || isNaN(Number(input.price)) || Number(input.price) < 0) {
      throw new Error('El precio debe ser un número positivo válido');
    }

    const title = input.title.trim();
    let slug = input.slug ? this.generateSlug(input.slug) : this.generateSlug(title);

    // Check slug collision within tenant
    const existingSlug = await (prisma as any).product.findUnique({
      where: {
        tenantId_slug: { tenantId, slug }
      }
    });
    if (existingSlug) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
    }

    // SKU generation and validation
    let sku = input.sku?.trim() || this.generateSku('PRD');
    // Ensure SKU is unique within tenant if provided
    const existingSku = await (prisma as any).product.findFirst({
      where: { tenantId, sku }
    });
    if (existingSku) {
      sku = this.generateSku('PRD');
    }

    // Validate categoryId if passed
    let categoryId = input.categoryId || null;
    let categoryName = input.category || 'General';

    if (categoryId) {
      const catRecord = await (prisma as any).category.findFirst({
        where: { id: categoryId, tenantId }
      });
      if (catRecord) {
        categoryName = catRecord.name;
      } else {
        categoryId = null;
      }
    }

    const productId = `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const price = Math.round(Number(input.price) * 100) / 100;
    const comparePrice = input.comparePrice !== undefined && input.comparePrice !== null
      ? Math.round(Number(input.comparePrice) * 100) / 100
      : null;
    const costPrice = input.costPrice !== undefined && input.costPrice !== null
      ? Math.round(Number(input.costPrice) * 100) / 100
      : null;
    const stock = input.stock !== undefined ? Math.max(0, Math.floor(Number(input.stock))) : 0;

    const created = await (prisma as any).product.create({
      data: {
        id: productId,
        tenantId,
        categoryId,
        title,
        slug,
        description: input.description?.trim() || '',
        price,
        comparePrice,
        costPrice,
        stock,
        sku,
        barcode: input.barcode?.trim() || null,
        category: categoryName,
        images: Array.isArray(input.images) && input.images.length > 0 
          ? input.images 
          : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
        featured: Boolean(input.featured),
        isBestSeller: Boolean(input.isBestSeller),
        isDeal: Boolean(input.isDeal),
        rating: 5.0,
        reviewsCount: 0,
        tags: Array.isArray(input.tags) ? input.tags : [],
        attributes: input.attributes || null,
        variants: input.variants || null,
        translations: input.translations || null,
        status: (input.status || 'active').toLowerCase()
      }
    });

    return this.mapToProductItem(created);
  }

  /**
   * READ: Get a product by ID or Slug with strict tenant scoping
   */
  static async getProduct(tenantId: string, idOrSlug: string): Promise<ProductItem | null> {
    if (!tenantId || !idOrSlug) return null;

    const product = await (prisma as any).product.findFirst({
      where: {
        tenantId,
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: {
        categoryRel: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!product) return null;
    return this.mapToProductItem(product);
  }

  /**
   * LIST: List products for a tenant with optional filtering
   */
  static async listProducts(
    tenantId: string,
    filters?: ProductListFilters
  ): Promise<{ products: ProductItem[]; total: number }> {
    if (!tenantId) {
      return { products: [], total: 0 };
    }

    const whereClause: any = { tenantId };

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        whereClause.status = { in: filters.status.map(s => s.toLowerCase()) };
      } else if (filters.status !== 'all' && filters.status !== 'ALL') {
        whereClause.status = filters.status.toLowerCase();
      }
    }

    if (filters?.category && filters.category !== 'all' && filters.category !== 'Todos') {
      whereClause.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters?.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters?.featured !== undefined) {
      whereClause.featured = filters.featured;
    }

    if (filters?.isDeal !== undefined) {
      whereClause.isDeal = filters.isDeal;
    }

    if (filters?.isBestSeller !== undefined) {
      whereClause.isBestSeller = filters.isBestSeller;
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } }
      ];
    }

    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    const [items, total] = await Promise.all([
      (prisma as any).product.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } }
        }
      }),
      (prisma as any).product.count({ where: whereClause })
    ]);

    return {
      products: items.map(this.mapToProductItem),
      total
    };
  }

  /**
   * UPDATE: Update an existing product
   */
  static async updateProduct(
    tenantId: string,
    id: string,
    updates: UpdateProductInput
  ): Promise<ProductItem> {
    if (!tenantId || !id) {
      throw new Error('Tenant ID e ID de producto son requeridos');
    }

    const existing = await (prisma as any).product.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Producto no encontrado o no pertenece a este comercio');
    }

    const data: any = {};

    if (updates.title !== undefined) {
      data.title = updates.title.trim();
    }

    if (updates.slug !== undefined) {
      const slug = this.generateSlug(updates.slug);
      const conflict = await (prisma as any).product.findFirst({
        where: { tenantId, slug, id: { not: id } }
      });
      if (conflict) {
        throw new Error(`El slug "${slug}" ya está en uso en esta tienda`);
      }
      data.slug = slug;
    }

    if (updates.description !== undefined) {
      data.description = updates.description ? updates.description.trim() : '';
    }

    if (updates.price !== undefined) {
      const p = Number(updates.price);
      if (isNaN(p) || p < 0) {
        throw new Error('El precio debe ser un número positivo válido');
      }
      data.price = Math.round(p * 100) / 100;
    }

    if (updates.comparePrice !== undefined) {
      data.comparePrice = updates.comparePrice !== null && !isNaN(Number(updates.comparePrice))
        ? Math.round(Number(updates.comparePrice) * 100) / 100
        : null;
    }

    if (updates.costPrice !== undefined) {
      data.costPrice = updates.costPrice !== null && !isNaN(Number(updates.costPrice))
        ? Math.round(Number(updates.costPrice) * 100) / 100
        : null;
    }

    if (updates.stock !== undefined) {
      const s = Number(updates.stock);
      if (isNaN(s) || s < 0) {
        throw new Error('El stock no puede ser negativo');
      }
      data.stock = Math.floor(s);
    }

    if (updates.sku !== undefined) {
      const sku = updates.sku.trim();
      const conflict = await (prisma as any).product.findFirst({
        where: { tenantId, sku, id: { not: id } }
      });
      if (conflict) {
        throw new Error(`El SKU "${sku}" ya está registrado en este comercio`);
      }
      data.sku = sku;
    }

    if (updates.barcode !== undefined) {
      data.barcode = updates.barcode ? updates.barcode.trim() : null;
    }

    if (updates.categoryId !== undefined) {
      if (updates.categoryId) {
        const cat = await (prisma as any).category.findFirst({
          where: { id: updates.categoryId, tenantId }
        });
        if (cat) {
          data.categoryId = cat.id;
          data.category = cat.name;
        } else {
          data.categoryId = null;
        }
      } else {
        data.categoryId = null;
      }
    }

    if (updates.category !== undefined && !data.category) {
      data.category = updates.category.trim();
    }

    if (updates.images !== undefined) {
      data.images = Array.isArray(updates.images) ? updates.images : [];
    }

    if (updates.featured !== undefined) {
      data.featured = Boolean(updates.featured);
    }

    if (updates.isBestSeller !== undefined) {
      data.isBestSeller = Boolean(updates.isBestSeller);
    }

    if (updates.isDeal !== undefined) {
      data.isDeal = Boolean(updates.isDeal);
    }

    if (updates.tags !== undefined) {
      data.tags = Array.isArray(updates.tags) ? updates.tags : [];
    }

    if (updates.attributes !== undefined) {
      data.attributes = updates.attributes;
    }

    if (updates.variants !== undefined) {
      data.variants = updates.variants;
    }

    if (updates.translations !== undefined) {
      data.translations = updates.translations;
    }

    if (updates.status !== undefined) {
      data.status = updates.status.toLowerCase();
    }

    const updated = await (prisma as any).product.update({
      where: { id },
      data,
      include: {
        categoryRel: { select: { id: true, name: true, slug: true } }
      }
    });

    return this.mapToProductItem(updated);
  }

  /**
   * DELETE: Delete a product
   */
  static async deleteProduct(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId || !id) return false;

    const existing = await (prisma as any).product.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Producto no encontrado o no pertenece a este comercio');
    }

    await (prisma as any).product.delete({
      where: { id }
    });

    return true;
  }

  /**
   * Mapper to standard ProductItem
   */
  private static mapToProductItem(p: any): ProductItem {
    return {
      id: p.id,
      tenantId: p.tenantId,
      title: p.title,
      slug: p.slug,
      description: p.description || '',
      category: p.category || 'General',
      price: Number(p.price) || 0,
      compareAtPrice: p.comparePrice ? Number(p.comparePrice) : undefined,
      costPrice: p.costPrice ? Number(p.costPrice) : undefined,
      sku: p.sku || '',
      barcode: p.barcode || undefined,
      stock: Number(p.stock) || 0,
      rating: Number(p.rating) || 5.0,
      reviewsCount: Number(p.reviewsCount) || 0,
      images: Array.isArray(p.images) && p.images.length > 0
        ? p.images
        : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
      tags: Array.isArray(p.tags) ? p.tags : [],
      isFeatured: Boolean(p.featured),
      featured: Boolean(p.featured),
      isBestSeller: Boolean(p.isBestSeller),
      isDeal: Boolean(p.isDeal),
      status: p.status,
      attributes: p.attributes || undefined,
      variants: p.variants || undefined,
      translations: p.translations || undefined,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
    };
  }
}
