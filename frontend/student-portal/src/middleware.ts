import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/accept-invite') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  // If user has refresh cookie and hits /login, convenience redirect to /
  if (refreshToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Next.js client-side AuthBootstrap & RequireRole handle detailed JWT/role verification
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
