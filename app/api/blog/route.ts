import { NextRequest, NextResponse } from 'next/server';
import { BlogService } from '@/lib/services/blog.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const category = searchParams.get('category') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : undefined;

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;
    let isStaffOrAdmin = false;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;

      const enabledCheck = await TenantContextHelper.requireEntitlement(auth.context, 'blog.enabled');
      if (!enabledCheck.success) {
        return enabledCheck.response;
      }
      targetTenantId = auth.context.tenant.id;
      isStaffOrAdmin = true;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      if (!publicContext) {
        return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
      }
      targetTenantId = publicContext.tenant.id;
    }

    if (id) {
      const post = await BlogService.getPostById(targetTenantId, id);
      if (!post) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
      if (!isStaffOrAdmin && post.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ post, tenantId: targetTenantId });
    }

    if (slug) {
      const post = await BlogService.getPostBySlug(targetTenantId, slug, { allowDraft: isStaffOrAdmin });
      if (!post) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });

      // Atomically increment views for public readers
      if (!isStaffOrAdmin) {
        BlogService.incrementViews(targetTenantId, post.id).catch(() => {});
      }

      return NextResponse.json({ post, tenantId: targetTenantId });
    }

    const [{ posts, total }, categories] = await Promise.all([
      BlogService.getPosts(targetTenantId, {
        category,
        tag,
        search,
        skip,
        take,
        allowDraft: isStaffOrAdmin
      }),
      BlogService.getCategories(targetTenantId)
    ]);

    return NextResponse.json({ posts, categories, total, tenantId: targetTenantId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error cargando blog' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;

    // Entitlement Check: blog.enabled
    const enabledCheck = await TenantContextHelper.requireEntitlement(auth.context, 'blog.enabled');
    if (!enabledCheck.success) {
      return enabledCheck.response;
    }

    // Entitlement Check: blog.posts_max
    const postLimitCheck = await TenantContextHelper.requireEntitlement(auth.context, 'blog.posts_max', {
      increment: 1
    });
    if (!postLimitCheck.success) {
      return postLimitCheck.response;
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: 'El título del artículo es obligatorio' }, { status: 400 });
    }

    // Author is authoritative: derived from authenticated session
    const post = await BlogService.createPost(
      tenant.id,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content || '',
        category: body.category || body.categoryName || 'Noticias',
        featuredImage: body.featuredImage,
        tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        status: body.status || 'PUBLISHED',
        publishedAt: body.publishedAt,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription || body.seoDesc,
        authorName: (session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN') ? (body.authorName || session?.name) : session?.name,
        authorAvatar: body.authorAvatar || session?.avatarUrl
      },
      {
        id: session?.userId,
        email: session?.email,
        name: session?.name || 'Redacción',
        role: session?.role
      }
    );

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'SLUG_CONFLICT' || error?.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Error creando artículo' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    const body = await req.json();
    const id = body.id || new URL(req.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de artículo requerido' }, { status: 400 });
    }

    const updated = await BlogService.updatePost(
      tenant.id,
      id,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category || body.categoryName,
        featuredImage: body.featuredImage,
        tags: Array.isArray(body.tags) ? body.tags : (typeof body.tags === 'string' ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : undefined),
        status: body.status,
        publishedAt: body.publishedAt,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription || body.seoDesc,
        authorName: (session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN') ? body.authorName : undefined,
        authorAvatar: body.authorAvatar
      },
      {
        id: session?.userId,
        email: session?.email
      }
    );

    return NextResponse.json({ success: true, post: updated });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error?.code === 'SLUG_CONFLICT' || error?.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Error actualizando artículo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant, session } = auth.context;
    await BlogService.deletePost(tenant.id, id, {
      id: session?.userId,
      email: session?.email
    });

    return NextResponse.json({ success: true, message: 'Artículo eliminado' });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Error eliminando artículo' }, { status: 500 });
  }
}
