import prisma from '@/lib/prisma';
import crypto from 'crypto';

export interface CategoryDTO {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; slug: string } | null;
  children?: { id: string; name: string; slug: string }[];
  _count?: { products: number };
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export class CategoryService {
  /**
   * Generates a URL-friendly slug
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `cat-${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * CREATE: Create a new category for a specific tenant
   */
  static async createCategory(tenantId: string, input: CreateCategoryInput): Promise<CategoryDTO> {
    if (!tenantId) {
      throw new Error('Tenant ID es requerido para crear una categoría');
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('El nombre de la categoría es obligatorio');
    }

    const name = input.name.trim();
    let slug = input.slug ? this.generateSlug(input.slug) : this.generateSlug(name);

    // Ensure unique slug within tenant
    const existing = await (prisma as any).category.findUnique({
      where: {
        tenantId_slug: { tenantId, slug }
      }
    });

    if (existing) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
    }

    // If parentId provided, verify it belongs to the same tenant
    if (input.parentId) {
      const parent = await (prisma as any).category.findFirst({
        where: { id: input.parentId, tenantId }
      });
      if (!parent) {
        throw new Error('La categoría padre no existe o no pertenece a este comercio');
      }
    }

    const categoryId = `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const created = await (prisma as any).category.create({
      data: {
        id: categoryId,
        tenantId,
        name,
        slug,
        description: input.description?.trim() || null,
        image: input.image?.trim() || null,
        parentId: input.parentId || null,
        status: input.status || 'ACTIVE'
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } }
      }
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      slug: created.slug,
      description: created.description,
      image: created.image,
      parentId: created.parentId,
      status: created.status || 'ACTIVE',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      parent: created.parent,
      children: created.children
    };
  }

  /**
   * READ: Get a single category by ID or Slug with strict tenant scoping
   */
  static async getCategory(tenantId: string, idOrSlug: string): Promise<CategoryDTO | null> {
    if (!tenantId || !idOrSlug) return null;

    const category = await (prisma as any).category.findFirst({
      where: {
        tenantId,
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } }
      }
    });

    if (!category) return null;

    return {
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      parentId: category.parentId,
      status: category.status || 'ACTIVE',
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      parent: category.parent,
      children: category.children,
      _count: category._count
    };
  }

  /**
   * LIST: List categories for a tenant (Admin or Public)
   */
  static async listCategories(
    tenantId: string,
    options?: {
      status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL';
      search?: string;
      parentId?: string | null;
      includeCounts?: boolean;
    }
  ): Promise<{ categories: CategoryDTO[]; total: number }> {
    if (!tenantId) {
      return { categories: [], total: 0 };
    }

    const whereClause: any = { tenantId };

    if (options?.status && options.status !== 'ALL') {
      whereClause.status = options.status;
    }

    if (options?.parentId !== undefined) {
      whereClause.parentId = options.parentId;
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).category.findMany({
        where: whereClause,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          children: { select: { id: true, name: true, slug: true } },
          ...(options?.includeCounts ? { _count: { select: { products: true } } } : {})
        },
        orderBy: { name: 'asc' }
      }),
      (prisma as any).category.count({ where: whereClause })
    ]);

    return {
      categories: items.map((c: any) => ({
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        parentId: c.parentId,
        status: c.status || 'ACTIVE',
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        parent: c.parent,
        children: c.children,
        _count: c._count
      })),
      total
    };
  }

  /**
   * UPDATE: Update a category with tenant authorization
   */
  static async updateCategory(
    tenantId: string,
    id: string,
    updates: UpdateCategoryInput
  ): Promise<CategoryDTO> {
    if (!tenantId || !id) {
      throw new Error('Tenant ID e ID de categoría son obligatorios');
    }

    const existing = await (prisma as any).category.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Categoría no encontrada o no pertenece a este comercio');
    }

    const data: any = {};

    if (updates.name !== undefined) {
      data.name = updates.name.trim();
    }

    if (updates.slug !== undefined) {
      const slug = this.generateSlug(updates.slug);
      // Check collision
      const slugConflict = await (prisma as any).category.findFirst({
        where: {
          tenantId,
          slug,
          id: { not: id }
        }
      });
      if (slugConflict) {
        throw new Error(`El slug "${slug}" ya está en uso en esta tienda`);
      }
      data.slug = slug;
    }

    if (updates.description !== undefined) {
      data.description = updates.description ? updates.description.trim() : null;
    }

    if (updates.image !== undefined) {
      data.image = updates.image ? updates.image.trim() : null;
    }

    if (updates.parentId !== undefined) {
      if (updates.parentId === id) {
        throw new Error('Una categoría no puede ser su propio padre');
      }
      if (updates.parentId) {
        const parent = await (prisma as any).category.findFirst({
          where: { id: updates.parentId, tenantId }
        });
        if (!parent) {
          throw new Error('Categoría padre no válida');
        }
      }
      data.parentId = updates.parentId;
    }

    if (updates.status !== undefined) {
      data.status = updates.status;
    }

    const updated = await (prisma as any).category.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true } }
      }
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      image: updated.image,
      parentId: updated.parentId,
      status: updated.status || 'ACTIVE',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      parent: updated.parent,
      children: updated.children
    };
  }

  /**
   * DELETE: Delete or soft-disable category
   */
  static async deleteCategory(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId || !id) return false;

    const existing = await (prisma as any).category.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new Error('Categoría no encontrada o no pertenece a este comercio');
    }

    // Detach any products assigned to this category
    await (prisma as any).product.updateMany({
      where: { categoryId: id, tenantId },
      data: { categoryId: null }
    });

    // Detach child categories
    await (prisma as any).category.updateMany({
      where: { parentId: id, tenantId },
      data: { parentId: null }
    });

    await (prisma as any).category.delete({
      where: { id }
    });

    return true;
  }
}
