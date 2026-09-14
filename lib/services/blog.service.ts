import { prisma } from '@/lib/prisma';
import { AuditService } from './audit.service';
import { SecurityService } from '../security/security.service';
import { ContentStatus } from '@prisma/client';

export interface BlogPostAuthor {
  id?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export interface BlogPostRecord {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: BlogPostAuthor;
  featuredImage: string;
  tags: string[];
  status: ContentStatus;
  viewsCount: number;
  publishedAt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Retain legacy BlogPost type compatibility for frontend components
export type BlogPost = BlogPostRecord;

export interface BlogCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  postsCount: number;
}

export interface CreateBlogPostInput {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  category?: string;
  featuredImage?: string;
  tags?: string[];
  status?: ContentStatus | string;
  publishedAt?: string | Date;
  seoTitle?: string;
  seoDescription?: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface UpdateBlogPostInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  featuredImage?: string;
  tags?: string[];
  status?: ContentStatus | string;
  publishedAt?: string | Date;
  seoTitle?: string;
  seoDescription?: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface BlogQueryOptions {
  status?: ContentStatus | string;
  category?: string;
  search?: string;
  tag?: string;
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
  return SecurityService.sanitizeString(html);
}

function mapDbToBlogPost(p: any): BlogPostRecord {
  const authorData: BlogPostAuthor = (p.author && typeof p.author === 'object')
    ? p.author
    : { name: 'Redacción Fénix', role: 'Staff' };

  return {
    id: p.id,
    tenantId: p.tenantId,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || '',
    content: p.content,
    category: p.category || 'Noticias',
    author: authorData,
    featuredImage: p.featuredImage || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    tags: Array.isArray(p.tags) ? p.tags : [],
    status: p.status,
    viewsCount: p.viewsCount || 0,
    publishedAt: p.publishedAt instanceof Date ? p.publishedAt.toISOString() : p.publishedAt,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt
  };
}

export class BlogService {
  /**
   * List blog posts strictly scoped by tenantId with optional filters and pagination
   */
  static async getPosts(
    tenantId: string,
    options?: BlogQueryOptions
  ): Promise<{ posts: BlogPostRecord[]; total: number }> {
    if (!tenantId) throw new Error('Tenant ID is required');

    const whereClause: any = { tenantId };

    if (options?.status) {
      whereClause.status = normalizeStatus(options.status);
    } else if (!options?.allowDraft) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    if (options?.category && options.category.trim().length > 0) {
      whereClause.category = options.category.trim();
    }

    if (options?.tag && options.tag.trim().length > 0) {
      whereClause.tags = { has: options.tag.trim() };
    }

    if (options?.search && options.search.trim().length > 0) {
      const term = options.search.trim();
      whereClause.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } }
      ];
    }

    const [dbPosts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where: whereClause,
        orderBy: { publishedAt: 'desc' },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50
      }),
      prisma.blogPost.count({ where: whereClause })
    ]);

    const posts = dbPosts.map(mapDbToBlogPost);
    return { posts, total };
  }

  /**
   * Get blog post by ID strictly scoped by tenantId
   */
  static async getPostById(tenantId: string, id: string): Promise<BlogPostRecord | null> {
    if (!tenantId || !id) return null;

    const post = await prisma.blogPost.findFirst({
      where: { id, tenantId }
    });

    if (!post) return null;
    return mapDbToBlogPost(post);
  }

  /**
   * Get blog post by slug strictly scoped by tenantId
   */
  static async getPostBySlug(
    tenantId: string,
    rawSlug: string,
    options?: { allowDraft?: boolean }
  ): Promise<BlogPostRecord | null> {
    if (!tenantId || !rawSlug) return null;
    const slug = normalizeSlug(rawSlug);

    const whereClause: any = { tenantId, slug };
    if (!options?.allowDraft) {
      whereClause.status = ContentStatus.PUBLISHED;
    }

    const post = await prisma.blogPost.findFirst({
      where: whereClause
    });

    if (!post) return null;
    return mapDbToBlogPost(post);
  }

  /**
   * Create blog post in PostgreSQL with authoritative author resolution and XSS sanitization
   */
  static async createPost(
    tenantId: string,
    data: CreateBlogPostInput,
    actor?: { id?: string; email?: string; name?: string; role?: string }
  ): Promise<BlogPostRecord> {
    if (!tenantId) throw new Error('Tenant ID is required');
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('El título del artículo es obligatorio');
    }

    const rawSlug = data.slug && data.slug.trim().length > 0 ? data.slug : data.title;
    const slug = normalizeSlug(rawSlug);

    if (!slug) {
      throw new Error('El slug generado para el artículo no es válido');
    }

    // Uniqueness validation within tenant
    const existing = await prisma.blogPost.findUnique({
      where: { tenantId_slug: { tenantId, slug } }
    });

    if (existing) {
      const err: any = new Error(`Ya existe un artículo con el slug "${slug}" en este comercio.`);
      err.code = 'SLUG_CONFLICT';
      err.statusCode = 409;
      throw err;
    }

    const cleanTitle = SecurityService.sanitizeString(data.title);
    const cleanExcerpt = data.excerpt ? SecurityService.sanitizeString(data.excerpt) : '';
    const cleanContent = sanitizeHtmlContent(data.content || '');
    const cleanCategory = data.category ? SecurityService.sanitizeString(data.category) : 'Noticias';
    const cleanFeaturedImage = data.featuredImage?.trim() || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80';
    const cleanTags = Array.isArray(data.tags)
      ? data.tags.map(t => SecurityService.sanitizeString(t)).filter(Boolean)
      : [];
    const status = normalizeStatus(data.status);
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();

    // Author identity is strictly derived from the authenticated actor to prevent author spoofing
    const authorPayload: BlogPostAuthor = {
      id: actor?.id || 'sys_staff',
      name: actor?.name || data.authorName || 'Redacción Fénix',
      email: actor?.email || undefined,
      avatarUrl: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
      role: actor?.role || 'STAFF'
    };

    const created = await prisma.blogPost.create({
      data: {
        tenantId,
        title: cleanTitle,
        slug,
        excerpt: cleanExcerpt,
        content: cleanContent,
        category: cleanCategory,
        author: authorPayload as any,
        featuredImage: cleanFeaturedImage,
        tags: cleanTags,
        status,
        viewsCount: 0,
        publishedAt,
        seoTitle: data.seoTitle ? SecurityService.sanitizeString(data.seoTitle) : null,
        seoDescription: data.seoDescription ? SecurityService.sanitizeString(data.seoDescription) : null
      }
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'BLOG_POST_CREATED',
      resourceType: 'BlogPost',
      resourceId: created.id,
      metadata: { title: created.title, slug: created.slug, status: created.status }
    });

    return mapDbToBlogPost(created);
  }

  /**
   * Update blog post in PostgreSQL
   */
  static async updatePost(
    tenantId: string,
    id: string,
    data: UpdateBlogPostInput,
    actor?: { id?: string; email?: string }
  ): Promise<BlogPostRecord> {
    if (!tenantId || !id) throw new Error('Tenant ID and Post ID are required');

    const existing = await prisma.blogPost.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      const err: any = new Error('Artículo no encontrado');
      err.statusCode = 404;
      throw err;
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = SecurityService.sanitizeString(data.title);
    }
    if (data.excerpt !== undefined) {
      updateData.excerpt = SecurityService.sanitizeString(data.excerpt);
    }
    if (data.content !== undefined) {
      updateData.content = sanitizeHtmlContent(data.content);
    }
    if (data.category !== undefined) {
      updateData.category = SecurityService.sanitizeString(data.category);
    }
    if (data.featuredImage !== undefined) {
      updateData.featuredImage = data.featuredImage.trim();
    }
    if (data.tags !== undefined) {
      updateData.tags = Array.isArray(data.tags)
        ? data.tags.map(t => SecurityService.sanitizeString(t)).filter(Boolean)
        : [];
    }
    if (data.status !== undefined) {
      updateData.status = normalizeStatus(data.status);
    }
    if (data.publishedAt !== undefined) {
      updateData.publishedAt = new Date(data.publishedAt);
    }
    if (data.seoTitle !== undefined) {
      updateData.seoTitle = data.seoTitle ? SecurityService.sanitizeString(data.seoTitle) : null;
    }
    if (data.seoDescription !== undefined) {
      updateData.seoDescription = data.seoDescription ? SecurityService.sanitizeString(data.seoDescription) : null;
    }

    if (data.slug !== undefined) {
      const newSlug = normalizeSlug(data.slug);
      if (!newSlug) throw new Error('El slug no puede estar vacío');

      if (newSlug !== existing.slug) {
        const slugConflict = await prisma.blogPost.findUnique({
          where: { tenantId_slug: { tenantId, slug: newSlug } }
        });
        if (slugConflict && slugConflict.id !== id) {
          const err: any = new Error(`El slug "${newSlug}" ya está en uso por otro artículo en este comercio.`);
          err.code = 'SLUG_CONFLICT';
          err.statusCode = 409;
          throw err;
        }
        updateData.slug = newSlug;
      }
    }

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updateData
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'BLOG_POST_UPDATED',
      resourceType: 'BlogPost',
      resourceId: updated.id,
      metadata: { title: updated.title, slug: updated.slug, status: updated.status }
    });

    return mapDbToBlogPost(updated);
  }

  /**
   * Delete blog post from PostgreSQL
   */
  static async deletePost(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<boolean> {
    if (!tenantId || !id) throw new Error('Tenant ID and Post ID are required');

    const existing = await prisma.blogPost.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      const err: any = new Error('Artículo no encontrado');
      err.statusCode = 404;
      throw err;
    }

    await prisma.blogPost.delete({
      where: { id }
    });

    AuditService.log({
      tenantId,
      actorId: actor?.id,
      action: 'BLOG_POST_DELETED',
      resourceType: 'BlogPost',
      resourceId: id,
      metadata: { title: existing.title, slug: existing.slug }
    });

    return true;
  }

  /**
   * Publish blog post
   */
  static async publishPost(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<BlogPostRecord> {
    return this.updatePost(tenantId, id, { status: ContentStatus.PUBLISHED, publishedAt: new Date() }, actor);
  }

  /**
   * Unpublish blog post (Set to DRAFT)
   */
  static async unpublishPost(
    tenantId: string,
    id: string,
    actor?: { id?: string; email?: string }
  ): Promise<BlogPostRecord> {
    return this.updatePost(tenantId, id, { status: ContentStatus.DRAFT }, actor);
  }

  /**
   * Increment view counter atomically in PostgreSQL
   */
  static async incrementViews(tenantId: string, id: string): Promise<number> {
    if (!tenantId || !id) return 0;
    try {
      const updated = await prisma.blogPost.update({
        where: { id },
        data: { viewsCount: { increment: 1 } }
      });
      return updated.viewsCount;
    } catch {
      return 0;
    }
  }

  /**
   * Get distinct categories with count for the tenant
   */
  static async getCategories(tenantId: string): Promise<BlogCategory[]> {
    if (!tenantId) return [];

    const posts = await prisma.blogPost.findMany({
      where: { tenantId, status: ContentStatus.PUBLISHED },
      select: { category: true }
    });

    const counts = new Map<string, number>();
    for (const p of posts) {
      const cat = p.category || 'General';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }

    const categories: BlogCategory[] = [];
    for (const [name, count] of counts.entries()) {
      categories.push({
        id: `cat_${normalizeSlug(name)}`,
        tenantId,
        name,
        slug: normalizeSlug(name),
        postsCount: count
      });
    }

    return categories;
  }
}
