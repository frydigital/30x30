'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization, OrganizationRole } from '@/lib/types';

interface OrganizationContextType {
  organization: Organization | null;
  userRole: OrganizationRole | null;
  loading: boolean;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ 
  children,
  organizationSlug 
}: { 
  children: ReactNode;
  organizationSlug?: string;
}) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganization = async () => {
    if (!organizationSlug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Get organization by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', organizationSlug)
        .eq('is_active', true)
        .single();

      if (orgError) throw orgError;

      setOrganization(org);

      // Get user's role in the organization
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && org) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', org.id)
          .eq('user_id', user.id)
          .single();

        setUserRole(member?.role || null);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setOrganization(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrganization();
  }, [organizationSlug]);

  return (
    <OrganizationContext.Provider value={{ organization, userRole, loading, refreshOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

/**
 * Hook to check if user has required permission level in the organization
 */
export function useOrganizationPermission(requiredRole: OrganizationRole = 'member'): boolean {
  const { userRole } = useOrganization();

  if (!userRole) return false;

  const roleHierarchy: Record<OrganizationRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
