import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Organization, 
  OrganizationMember, 
  OrganizationRole, 
  UserOrganization,
  OrganizationSettings,
  OrganizationInvitation
} from '../types';

/**
 * Create a new organization with the current user as owner
 */
export async function createOrganization(
  supabase: SupabaseClient,
  data: {
    name: string;
    slug: string;
    description?: string;
  }
): Promise<{ data: Organization | null; error: Error | null }> {
  try {
    // Call the database function to create organization
    const { data: result, error } = await supabase.rpc('create_organization', {
      p_name: data.name,
      p_slug: data.slug,
      p_description: data.description || null,
    });

    if (error) throw error;

    // Fetch the created organization
    const { data: organization, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', result)
      .single();

    if (fetchError) throw fetchError;

    return { data: organization, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get an organization by slug
 */
export async function getOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ data: Organization | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(
  supabase: SupabaseClient,
  userId?: string
): Promise<{ data: UserOrganization[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_user_organizations', {
      p_user_id: userId || null,
    });

    if (error) throw error;

    return { data: data as UserOrganization[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  supabase: SupabaseClient,
  data: {
    organizationId: string;
    userId: string;
    role?: OrganizationRole;
  }
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase.rpc('add_organization_member', {
      p_organization_id: data.organizationId,
      p_user_id: data.userId,
      p_role: data.role || 'member',
    });

    if (error) throw error;

    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ data: (OrganizationMember & { profile: { id: string; email: string; username: string | null; avatar_url: string | null } })[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles(id, email, username, avatar_url)
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return { data: data as (OrganizationMember & { profile: { id: string; email: string; username: string | null; avatar_url: string | null } })[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: OrganizationRole
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Remove a member from organization
 */
export async function removeOrganizationMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Check if user has permission in organization
 */
export async function hasOrganizationPermission(
  supabase: SupabaseClient,
  organizationId: string,
  requiredRole: OrganizationRole = 'member',
  userId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_organization_permission', {
      p_organization_id: organizationId,
      p_user_id: userId || null,
      p_required_role: requiredRole,
    });

    if (error) throw error;

    return data === true;
  } catch {
    return false;
  }
}

/**
 * Get organization settings
 */
export async function getOrganizationSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ data: OrganizationSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update organization settings
 */
export async function updateOrganizationSettings(
  supabase: SupabaseClient,
  organizationId: string,
  settings: Partial<OrganizationSettings>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organization_settings')
      .update(settings)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Create an organization invitation
 */
/**
 * Generate a cryptographically secure random token for invitations
 */
function generateSecureToken(): string {
  // Generate 32 random bytes for a secure token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to base64url format (URL-safe)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function createOrganizationInvitation(
  supabase: SupabaseClient,
  data: {
    organizationId: string;
    email: string;
    role?: OrganizationRole;
  }
): Promise<{ data: OrganizationInvitation | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate cryptographically secure token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: invitation, error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: data.organizationId,
        email: data.email,
        role: data.role || 'member',
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { data: invitation, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get organization invitation by token
 */
export async function getOrganizationInvitation(
  supabase: SupabaseClient,
  token: string
): Promise<{ data: (OrganizationInvitation & { organization: Organization }) | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (error) throw error;

    // Check if invitation is expired
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    return { data: data as (OrganizationInvitation & { organization: Organization }), error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Accept an organization invitation
 */
export async function acceptOrganizationInvitation(
  supabase: SupabaseClient,
  token: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    // Get invitation
    const { data: invitation, error: inviteError } = await getOrganizationInvitation(supabase, token);
    if (inviteError) throw inviteError;
    if (!invitation) throw new Error('Invitation not found');

    // Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });

    if (memberError) throw memberError;

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Update organization details
 */
export async function updateOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  updates: Partial<Organization>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Validate organization slug format
 */
export function validateOrganizationSlug(slug: string): { valid: boolean; error?: string } {
  // Must be 3-63 characters
  if (slug.length < 3 || slug.length > 63) {
    return { valid: false, error: 'Slug must be between 3 and 63 characters' };
  }

  // Must start and end with alphanumeric
  if (!/^[a-z0-9]/.test(slug) || !/[a-z0-9]$/.test(slug)) {
    return { valid: false, error: 'Slug must start and end with a letter or number' };
  }

  // Can only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }

  // Cannot have consecutive hyphens
  if (/--/.test(slug)) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }

  return { valid: true };
}

/**
 * Generate slug from organization name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .substring(0, 63); // Limit length
}
