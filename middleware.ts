import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || 'localhost:3000';

  // 1. Resolve domain & subdomain logic (Points 7 & 23)
  const isCustomDomain = !hostname.includes('localhost') && 
                         !hostname.includes('run.app') && 
                         !hostname.includes('vercel.app');

  let tenantSlug = 'mitienda';

  if (hostname.includes('.fenixcms.com')) {
    tenantSlug = hostname.replace('.fenixcms.com', '');
  } else if (isCustomDomain) {
    // Custom domain mapping
    tenantSlug = hostname.replace(/:\d+$/, '').replace(/\./g, '-');
  }

  // Set tenant context header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenantSlug);
  requestHeaders.set('x-resolved-hostname', hostname);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
