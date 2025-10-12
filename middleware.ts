

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  
  const publicPaths = [
    '/login',
    '/api/auth', 
    '/icon.png', 
  ];

  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  
  const token = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');

  
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/login', request.url);
    
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  
  return NextResponse.next();
}


export const config = {
  matcher: [
    
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};