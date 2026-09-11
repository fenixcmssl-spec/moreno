import { NextRequest, NextResponse } from 'next/server';
import { BlogService } from '@/lib/services/blog.service';
import { TenantContextHelper } from '@/lib/auth/tenantContext';
import { AuditService } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const session = await TenantContextHelper.getSessionFromRequest(req);
    let targetTenantId: string;

    if (session && session.role !== 'CUSTOMER') {
      const auth = await TenantContextHelper.requireTenant(req);
      if (!auth.success) return auth.response;
      
      const enabledCheck = await TenantContextHelper.requireEntitlement(auth.context, 'blog.enabled');
      if (!enabledCheck.success) {
        return enabledCheck.response;
      }
      targetTenantId = auth.context.tenant.id;
    } else {
      const publicContext = await TenantContextHelper.resolvePublicTenant(req);
      targetTenantId = publicContext.tenant?.id || 'tenant_1';
    }

    if (slug) {
      const post = BlogService.getPostBySlug(targetTenantId, slug);
      if (!post) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
      return NextResponse.json({ post, tenantId: targetTenantId });
    }

    const posts = BlogService.getPosts(targetTenantId);
    const categories = BlogService.getCategories(targetTenantId);

    return NextResponse.json({ posts, categories, total: posts.length, tenantId: targetTenantId });
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

    const post = BlogService.createPost(tenant.id, {
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt: body.excerpt || '',
      content: body.content || '',
      featuredImage: body.featuredImage || 'https://picsum.photos/seed/blog/800/600',
      status: body.status || 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      authorName: session?.name || 'Redacción',
      authorAvatar: body.authorAvatar,
      categoryId: body.categoryId,
      categoryName: body.categoryName,
      tags: body.tags || [],
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creando artículo' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const auth = await TenantContextHelper.requireTenantRole(req, 'STAFF');
    if (!auth.success) return auth.response;

    const { tenant } = auth.context;
    const success = BlogService.deletePost(tenant.id, id);

    if (!success) {
      return NextResponse.json({ error: 'Artículo no encontrado o no pertenece a este comercio' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Artículo eliminado' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error eliminando artículo' }, { status: 500 });
  }
}
