import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { extractSubdomain, isRootDomain } from "@/lib/organizations/subdomain";

export async function middleware(request: NextRequest) {
  // Get the hostname
  const hostname = request.headers.get("host") || "";
  
  // Extract organization slug from subdomain
  const organizationSlug = extractSubdomain(hostname);
  
  // Clone the URL to potentially modify it
  const url = request.nextUrl.clone();
  
  // Add organization context to headers for use in the app
  const requestHeaders = new Headers(request.headers);
  if (organizationSlug) {
    requestHeaders.set("x-organization-slug", organizationSlug);
  }
  
  // Handle Supabase session
  const response = await updateSession(request);
  
  // Apply the organization header to the response
  if (organizationSlug) {
    response.headers.set("x-organization-slug", organizationSlug);
  }
  
  // If accessing root domain and on an organization-only route, redirect to main site
  if (isRootDomain(hostname)) {
    // Routes that should only be accessible within an organization context
    const orgOnlyRoutes = ['/org/', '/organization/'];
    const isOrgOnlyRoute = orgOnlyRoutes.some(route => url.pathname.startsWith(route));
    
    if (isOrgOnlyRoute) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  // If accessing an organization subdomain
  if (organizationSlug && !isRootDomain(hostname)) {
    // Routes that should only be accessible on the root domain
    const rootOnlyRoutes = ['/create-organization'];
    const isRootOnlyRoute = rootOnlyRoutes.some(route => url.pathname.startsWith(route));
    
    if (isRootOnlyRoute) {
      // Redirect to root domain
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
      const rootUrl = process.env.NODE_ENV === 'development' 
        ? `${protocol}://localhost:3000${url.pathname}${url.search}`
        : `${protocol}://${baseDomain}${url.pathname}${url.search}`;
      
      return NextResponse.redirect(rootUrl);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
