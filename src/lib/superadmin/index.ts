import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Superadmin,
  SubscriptionPlan,
  OrganizationSubscription,
  SubscriptionHistory,
  OrganizationStatistics,
  Organization,
  BillingCycle,
  SubscriptionStatus
} from '../types';

/**
 * Check if user is a superadmin
 */
export async function isSuperadmin(
  supabase: SupabaseClient,
  userId?: string
): Promise<boolean> {
  try {
    // If no userId provided, get current user
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      userId = user.id;
    }

    const { data, error } = await supabase.rpc('is_superadmin', {
      p_user_id: userId
    });

    if (error) {
      console.error('RPC error checking superadmin status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }
}

/**
 * Get all superadmins
 */
export async function getAllSuperadmins(
  supabase: SupabaseClient
): Promise<{ data: (Superadmin & { profile: { email: string; username: string | null } })[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('superadmins')
      .select(`
        *,
        profile:profiles!superadmins_user_id_fkey(email, username)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Grant superadmin access to a user
 */
export async function grantSuperadmin(
  supabase: SupabaseClient,
  userId: string,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('superadmins')
      .insert({
        user_id: userId,
        granted_by: user.id,
        notes: notes || null,
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Revoke superadmin access from a user
 */
export async function revokeSuperadmin(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('superadmins')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans(
  supabase: SupabaseClient,
  activeOnly = false
): Promise<{ data: SubscriptionPlan[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get organization statistics for superadmin dashboard
 */
export async function getOrganizationStatistics(
  supabase: SupabaseClient
): Promise<{ data: OrganizationStatistics[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_statistics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all organizations with detailed info
 */
export async function getAllOrganizations(
  supabase: SupabaseClient
): Promise<{ data: (Organization & { 
  subscription?: OrganizationSubscription & { plan: SubscriptionPlan };
  member_count?: number;
})[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        subscription:organization_subscriptions(
          *,
          plan:subscription_plans(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update organization subscription
 */
export async function updateOrganizationSubscription(
  supabase: SupabaseClient,
  organizationId: string,
  data: {
    plan_id?: string;
    status?: SubscriptionStatus;
    billing_cycle?: BillingCycle;
    cancel_at_period_end?: boolean;
    trial_ends_at?: string | null;
  }
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current subscription
    const { data: currentSub } = await supabase
      .from('organization_subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('organization_id', organizationId)
      .single();

    // Update subscription
    const { error: updateError } = await supabase
      .from('organization_subscriptions')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    if (updateError) throw updateError;

    // Log subscription history if plan changed
    if (data.plan_id && currentSub && data.plan_id !== currentSub.plan_id) {
      const action = currentSub.plan.price_monthly && data.plan_id 
        ? (await getPlanPrice(supabase, data.plan_id)) > currentSub.plan.price_monthly
          ? 'upgraded'
          : 'downgraded'
        : 'created';

      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          plan_id: data.plan_id,
          action,
          previous_plan_id: currentSub.plan_id,
          changed_by: user.id,
        });
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get plan price for comparison
 */
async function getPlanPrice(supabase: SupabaseClient, planId: string): Promise<number> {
  const { data } = await supabase
    .from('subscription_plans')
    .select('price_monthly')
    .eq('id', planId)
    .single();
  
  return data?.price_monthly || 0;
}

/**
 * Get subscription history for an organization
 */
export async function getSubscriptionHistory(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ data: (SubscriptionHistory & { 
  plan: SubscriptionPlan;
  previous_plan?: SubscriptionPlan;
  changed_by_user?: { email: string; username: string | null };
})[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select(`
        *,
        plan:subscription_plans!subscription_history_plan_id_fkey(*),
        previous_plan:subscription_plans!subscription_history_previous_plan_id_fkey(*),
        changed_by_user:profiles!subscription_history_changed_by_fkey(email, username)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Deactivate an organization
 */
export async function deactivateOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Reactivate an organization
 */
export async function reactivateOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Create a new subscription plan
 */
export async function createSubscriptionPlan(
  supabase: SupabaseClient,
  data: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: SubscriptionPlan | null; error: Error | null }> {
  try {
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return { data: plan, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update a subscription plan
 */
export async function updateSubscriptionPlan(
  supabase: SupabaseClient,
  planId: string,
  updates: Partial<SubscriptionPlan>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', planId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get platform-wide statistics
 */
export async function getPlatformStatistics(
  supabase: SupabaseClient
): Promise<{ 
  data: {
    total_organizations: number;
    active_organizations: number;
    total_users: number;
    active_users_30d: number;
    total_activities_30d: number;
    subscriptions_by_plan: { plan_name: string; count: number }[];
  } | null; 
  error: Error | null;
}> {
  try {
    // Get organization counts
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get user counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users (with activities in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeUsersData } = await supabase
      .from('activities')
      .select('user_id', { count: 'exact' })
      .gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const activeUsers = new Set(activeUsersData?.map(a => a.user_id)).size;

    // Get total activities
    const { count: totalActivities } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0]);

    // Get subscriptions by plan
    const { data: subsData } = await supabase
      .from('organization_subscriptions')
      .select('plan:subscription_plans(name)')
      .eq('status', 'active');

    const subsByPlan = subsData?.reduce((acc, sub) => {
      const planName = (sub.plan as any)?.name || 'Unknown';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const subscriptions_by_plan = Object.entries(subsByPlan || {}).map(([plan_name, count]) => ({
      plan_name,
      count,
    }));

    return {
      data: {
        total_organizations: totalOrgs || 0,
        active_organizations: activeOrgs || 0,
        total_users: totalUsers || 0,
        active_users_30d: activeUsers,
        total_activities_30d: totalActivities || 0,
        subscriptions_by_plan,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
