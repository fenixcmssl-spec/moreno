import { prisma } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { SecurityService } from '../security/security.service';
import { ContentStatus } from '@prisma/client';

export interface PageRecord {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: string;
  status: ContentStatus;
  seoTitle?: string | null;
  seoDesc?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  title: string;
  slug?: string;
  content: string;
  status?: ContentStatus | string;
  seoTitle?: string;
  seoDesc?: string;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  content?: string;
  status?: ContentStatus | string;
  seoTitle?: string;
  seoDesc?: string;
}

export interface PageQueryOptions {
  status?: ContentStatus | string;
  search?: string;
  skip?: number;
  take?: number;
  allowDraft?: boolean;
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
  if (upper === 'ARCHIVED') return ContentStatus.ARCHIVED;
  return ContentStatus.PUBLISHED;
}

function sanitizeHtmlContent(html: string): string {
  if (!html || typeof html !== 'string') return '';
  // SecurityService removes malicious scripts, event handlers, javascript: URIs
  return SecurityService.sanitizeString(html);
}

export class PageService {
  /**
   * List pages strictly scoped by tenantId
   */
  static async getPages(tenantId: string, options?: PageQueryOptions): Promise<{ pages: PageRecord[]; total: number }> {
    if (!tenantId) throw new Error('Tenant ID is required');

    const whereClause: any = { tenantId };

    if (options?.status) {
      whereClause.status = normalizeStatus(options.status);
    } else if (!options?.allowDraft) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    if (options?.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      whereClause.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [dbPages, total] = await Promise.all([
      prisma.page.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50
      }),
      prisma.page.count({ where: whereClause })
    ]);

    const pages: PageRecord[] = dbPages.map(p => ({
      id: p.id,
      tenantId: p.tenantId,
      title: p.title,
      slug: p.slug,
      content: p.content,
      status: p.status,
      seoTitle: p.seoTitle,
      seoDesc: p.seoDesc,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    }));

    return { pages, total };
  }

  /**
   * Get page by ID strictly scoped by tenantId
   */
  static async getPageById(tenantId: string, id: string): Promise<PageRecord | null> {
    if (!tenantId || !id) return null;

    const p = await prisma.page.findFirst({
      where: { id, tenantId }
    });

    if (!p) return null;

    return {
      id: p.id,
      tenantId: p.tenantId,
      title: p.title,
      slug: p.slug,
      content: p.content,
      status: p.status,
      seoTitle: p.seoTitle,
      seoDesc: p.seoDesc,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    };
  }

  /**
   * Get page by slug strictly scoped by tenantId
   */
  static async getPageBySlug(tenantId: string, rawSlug: string, options?: { allowDraft?: boolean }): Promise<PageRecord | null> {
    if (!tenantId || !rawSlug) return null;
    const slug = normalizeSlug(rawSlug);

    const whereClause: any = { tenantId, slug };
    if (!options?.allowDraft) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    const p = await prisma.page.findFirst({
      where: whereClause
    });

    if (!p) return null;

    return {
      id: p.id,
      tenantId: p.tenantId,
      title: p.title,
      slug: p.slug,
      content: p.content,
      status: p.status,
      seoTitle: p.seoTitle,
      seoDesc: p.seoDesc,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString()
    };
  }

  /**
   * Create a new Page in PostgreSQL with XSS sanitization and slug conflict validation
   */
  static async createPage(
    tenantId: string,
    data: CreatePageInput,
    actor?: { id?: string; email?: string }
  ): Promise<PageRecord> {
    if (!tenantId) throw new Error('Tenant ID is required');
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('El título de la página es obligatorio');
    }

    const rawSlug = data.slug && data.slug.trim().length > 0 ? data.slug : data.title;
    const slug = normalizeSlug(rawSlug);

    if (!slug) {
      throw new Error('El slug generado para la página no es válido');
    }

    // Check slug uniqueness within tenant
    const existing = await prisma.page.findUnique({
      where: { tenantId_slug: { tenantId, slug } }
    });

    if (existing) {
      const err: any = new Error(`Ya existe una página con el slug "${slug}" en este comercio.`);
      err.code = 'SLUG_CONFLICT';
      err.statusCode = 409;
      throw err;
    }

    const cleanTitle = SecurityService.sanitizeString(data.title);
    const cleanContent = sanitizeHtmlContent(data.content || '');
    const cleanSeoTitle = data.seoTitle ? SecurityService.sanitizeString(data.seoTitle) : null;
    const cleanSeoDesc = data.seoDesc ? SecurityService.sanitizeString(data.seoDesc) : null;
    const status = normalizeStatus(data.status);

    const created = await prisma.page.create({
      data: {
        tenantId,
        title: cleanTitle,
        slug,
        content: cleanContent,
        status,
        seoTitle: cleanSeoTitle,
        seoDesc: cleanSeoDesc
      }
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'PAGE_CREATED',
      resourceType: 'Page',
      resourceId: created.id,
      metadata: { title: created.title, slug: created.slug, status: created.status }
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      title: created.title,
      slug: created.slug,
      content: created.content,
      status: created.status,
      seoTitle: created.seoTitle,
      seoDesc: created.seoDesc,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  }

  /**
   * Update an existing Page in PostgreSQL
   */
  static async updatePage(
    tenantId: string,
    id: string,
    data: UpdatePageInput,
    actor?: { id?: string; email?: string }
  ): Promise<PageRecord> {
    if (!tenantId || !id) throw new Error('Tenant ID and Page ID are required');

    const existing = await prisma.page.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      const err: any = new Error('Página no encontrada');
      err.statusCode = 404;
      throw err;
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = SecurityService.sanitizeString(data.title);
    }

    if (data.content !== undefined) {
      updateData.content = sanitizeHtmlContent(data.content);
    }

    if (data.seoTitle !== undefined) {
      updateData.seoTitle = data.seoTitle ? SecurityService.sanitizeString(data.seoTitle) : null;
    }

    if (data.seoDesc !== undefined) {
      updateData.seoDesc = data.seoDesc ? SecurityService.sanitizeString(data.seoDesc) : null;
    }

    if (data.status !== undefined) {
      updateData.status = normalizeStatus(data.status);
    }

    if (data.slug !== undefined) {
      const newSlug = normalizeSlug(data.slug);
      if (!newSlug) throw new Error('El slug no puede estar vacío');

      if (newSlug !== existing.slug) {
        const slugConflict = await prisma.page.findUnique({
          where: { tenantId_slug: { tenantId, slug: newSlug } }
        });
        if (slugConflict && slugConflict.id !== id) {
          const err: any = new Error(`El slug "${newSlug}" ya está en uso por otra página en este comercio.`);
          err.code = 'SLUG_CONFLICT';
          err.statusCode = 409;
          throw err;
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.page.update({
      where: { id },
      data: updateData
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'PAGE_UPDATED',
      resourceType: 'Page',
      resourceId: updated.id,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status }
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      title: updated.title,
      slug: updated.slug,
      content: updated.content,
      status: updated.status,
      seoTitle: updated.seoTitle,
      seoDesc: updated.seoDesc,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  }

  /**
   * Delete Page from PostgreSQL
   */
  static async deletePage(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<boolean> {
    if (!tenantId || !id) throw new Error('Tenant ID and Page ID are required');

    const existing = await prisma.page.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      const err: any = new Error('Página no encontrada');
      err.statusCode = 404;
      throw err;
    }

    await prisma.page.delete({
      where: { id }
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'PAGE_DELETED',
      resourceType: 'Page',
      resourceId: id,
      metadata: { title: existing.title, slug: existing.slug }
    });

    return true;
  }

  /**
   * Publish a Page
   */
  static async publishPage(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<PageRecord> {
    return this.updatePage(tenantId, id, { status: ContentStatus.PUBLISHED }, actor);
  }

  /**
   * Unpublish a Page (Set to DRAFT)
   */
  static async unpublishPage(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<PageRecord> {
    return this.updatePage(tenantId, id, { status: ContentStatus.DRAFT }, actor);
  }
}
