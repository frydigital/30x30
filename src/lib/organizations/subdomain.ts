/**
 * Extract organization slug from subdomain
 * @param hostname - The request hostname (e.g., "acme.30x30.app" or "localhost:3000")
 * @returns Organization slug or null if not a subdomain
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Get the base domain from environment or use default
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
  
  // For localhost development, check for specific patterns
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  // Check if hostname ends with base domain
  if (!host.endsWith(`.${baseDomain}`)) {
    return null;
  }

  // Extract subdomain
  const subdomain = host.replace(`.${baseDomain}`, '');

  // Ignore www subdomain
  if (subdomain === 'www' || subdomain === '') {
    return null;
  }

  // Validate subdomain format (lowercase letters, numbers, and hyphens)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Check if the hostname represents the main/root domain
 */
export function isRootDomain(hostname: string): boolean {
  const host = hostname.split(':')[0];
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
  
  return host === baseDomain || 
         host === `www.${baseDomain}` || 
         host === 'localhost' || 
         host === '127.0.0.1';
}

/**
 * Build organization URL from slug
 */
export function buildOrganizationUrl(slug: string): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  // In development, use localhost with port
  if (process.env.NODE_ENV === 'development') {
    return `${protocol}://localhost:3000?org=${slug}`;
  }

  return `${protocol}://${slug}.${baseDomain}`;
}

/**
 * Build root/main domain URL
 */
export function buildRootUrl(): string {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  
  if (process.env.NODE_ENV === 'development') {
    return `${protocol}://localhost:3000`;
  }

  return `${protocol}://${baseDomain}`;
}

/**
 * Get organization slug from URL (handles both subdomain and query param for development)
 */
export function getOrganizationSlugFromRequest(hostname: string, searchParams?: URLSearchParams): string | null {
  // First try to get from query param (for development)
  if (searchParams?.has('org')) {
    return searchParams.get('org');
  }

  // Then try to extract from subdomain
  return extractSubdomain(hostname);
}
