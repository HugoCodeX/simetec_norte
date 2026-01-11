import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que requieren autenticación
const protectedRoutes = ["/dashboard", "/gastos", "/presupuestos", "/profile", "/admin"];

// Rutas públicas (no requieren autenticación)
const publicRoutes = ["/", "/iniciar-sesion", "/sign-up", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  );

  // Obtener la cookie de sesión de better-auth
  const sessionCookie = request.cookies.get("simetec.session_token") || 
                        request.cookies.get("__Secure-simetec.session_token");

  // Si es una ruta protegida, agregar headers para evitar caché
  if (isProtectedRoute) {
    const response = NextResponse.next();
    
    // Headers para prevenir que el navegador cachee páginas protegidas
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");
    
    // Si no hay sesión, redirigir al login
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
