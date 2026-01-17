-- Superadmin Schema for 30x30 Challenge
-- Run this after multi-tenancy-schema.sql
-- Adds superadmin capabilities and subscription management

-- ============================================
-- SUPERADMINS TABLE
-- ============================================
-- Track users who have superadmin privileges
CREATE TABLE IF NOT EXISTS superadmins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT, -- Optional notes about why superadmin access was granted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================
-- Define available subscription plans for organizations
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "Free", "Starter", "Pro", "Enterprise"
  slug TEXT UNIQUE NOT NULL, -- e.g., "free", "starter", "pro", "enterprise"
  description TEXT,
  price_monthly DECIMAL(10, 2) DEFAULT 0,
  price_yearly DECIMAL(10, 2) DEFAULT 0,
  max_members INTEGER, -- NULL = unlimited
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature flags
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION SUBSCRIPTIONS TABLE
-- ============================================
-- Track subscription status for each organization
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT NOT NULL,
  status TEXT DEFAULT 'active', -- active, canceled, past_due, trialing
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_customer_id TEXT, -- Stripe customer ID
  stripe_subscription_id TEXT, -- Stripe subscription ID
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

-- ============================================
-- SUBSCRIPTION HISTORY TABLE
-- ============================================
-- Track changes to organization subscriptions
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT NOT NULL,
  action TEXT NOT NULL, -- created, upgraded, downgraded, canceled, renewed
  previous_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION STATISTICS VIEW
-- ============================================
-- Helpful view for superadmins to see organization metrics
CREATE OR REPLACE VIEW organization_statistics AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.created_at,
  o.is_active,
  sp.name as plan_name,
  sp.slug as plan_slug,
  os.status as subscription_status,
  COUNT(DISTINCT om.user_id) as member_count,
  COUNT(DISTINCT CASE WHEN om.role = 'owner' THEN om.user_id END) as owner_count,
  COUNT(DISTINCT CASE WHEN om.role = 'admin' THEN om.user_id END) as admin_count,
  COUNT(DISTINCT a.user_id) as active_users_30d,
  SUM(CASE WHEN da.activity_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as total_activities_30d
FROM organizations o
LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN subscription_plans sp ON os.plan_id = sp.id
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN activities a ON o.id = a.organization_id 
  AND a.activity_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN daily_activities da ON o.id = da.organization_id
GROUP BY o.id, o.name, o.slug, o.created_at, o.is_active, sp.name, sp.slug, os.status;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_superadmins_user ON superadmins(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON organization_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_org ON subscription_history(organization_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_subscriptions_updated_at ON organization_subscriptions;
CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Superadmins table policies
-- Only superadmins can view the superadmins table
DROP POLICY IF EXISTS "Superadmins can view superadmins" ON superadmins;
CREATE POLICY "Superadmins can view superadmins" ON superadmins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Only superadmins can manage superadmins
DROP POLICY IF EXISTS "Superadmins can manage superadmins" ON superadmins;
CREATE POLICY "Superadmins can manage superadmins" ON superadmins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Subscription plans policies
-- Anyone can view active subscription plans (for pricing page)
DROP POLICY IF EXISTS "Active plans are viewable by everyone" ON subscription_plans;
CREATE POLICY "Active plans are viewable by everyone" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Only superadmins can manage plans
DROP POLICY IF EXISTS "Superadmins can manage subscription plans" ON subscription_plans;
CREATE POLICY "Superadmins can manage subscription plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Organization subscriptions policies
-- Organization owners/admins can view their subscription
DROP POLICY IF EXISTS "Org admins can view subscription" ON organization_subscriptions;
CREATE POLICY "Org admins can view subscription" ON organization_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_subscriptions.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Superadmins can view all subscriptions
DROP POLICY IF EXISTS "Superadmins can view all subscriptions" ON organization_subscriptions;
CREATE POLICY "Superadmins can view all subscriptions" ON organization_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Only superadmins can manage subscriptions
DROP POLICY IF EXISTS "Superadmins can manage subscriptions" ON organization_subscriptions;
CREATE POLICY "Superadmins can manage subscriptions" ON organization_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Subscription history policies
-- Organization owners/admins can view their history
DROP POLICY IF EXISTS "Org admins can view subscription history" ON subscription_history;
CREATE POLICY "Org admins can view subscription history" ON subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = subscription_history.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Superadmins can view all history
DROP POLICY IF EXISTS "Superadmins can view all subscription history" ON subscription_history;
CREATE POLICY "Superadmins can view all subscription history" ON subscription_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- System can insert history records
DROP POLICY IF EXISTS "System can insert subscription history" ON subscription_history;
CREATE POLICY "System can insert subscription history" ON subscription_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is a superadmin
CREATE OR REPLACE FUNCTION is_superadmin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM superadmins
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization subscription info
CREATE OR REPLACE FUNCTION get_organization_subscription(p_org_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  plan_slug TEXT,
  status TEXT,
  member_limit INTEGER,
  current_members BIGINT,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.name,
    sp.slug,
    os.status,
    sp.max_members,
    COUNT(om.user_id),
    sp.features
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  LEFT JOIN organization_members om ON os.organization_id = om.organization_id
  WHERE os.organization_id = p_org_id
  GROUP BY sp.name, sp.slug, os.status, sp.max_members, sp.features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default subscription for new organization
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE slug = 'free' AND is_active = true
  LIMIT 1;

  -- Create subscription on free plan
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO organization_subscriptions (
      organization_id,
      plan_id,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      NEW.id,
      v_free_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 year' -- Free plan doesn't expire
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default subscription
DROP TRIGGER IF EXISTS create_org_default_subscription ON organizations;
CREATE TRIGGER create_org_default_subscription
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ============================================
-- SEED DEFAULT SUBSCRIPTION PLANS
-- ============================================
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_members, features, display_order)
VALUES 
  (
    'Free',
    'free',
    'Perfect for small teams getting started',
    0,
    0,
    10,
    '["Basic leaderboard", "Manual activity entry", "30-day challenge tracking"]'::jsonb,
    1
  ),
  (
    'Starter',
    'starter',
    'Great for growing teams',
    9.99,
    99.99,
    50,
    '["Everything in Free", "Strava integration", "Garmin integration", "Custom branding", "Email support"]'::jsonb,
    2
  ),
  (
    'Pro',
    'pro',
    'For serious fitness organizations',
    29.99,
    299.99,
    200,
    '["Everything in Starter", "Advanced analytics", "Custom challenges", "API access", "Priority support"]'::jsonb,
    3
  ),
  (
    'Enterprise',
    'enterprise',
    'Custom solutions for large organizations',
    NULL,
    NULL,
    NULL,
    '["Everything in Pro", "Unlimited members", "Dedicated support", "Custom integrations", "SLA guarantee"]'::jsonb,
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant view access to organization_statistics view
GRANT SELECT ON organization_statistics TO authenticated;

COMMENT ON TABLE superadmins IS 'Users with superadmin privileges to manage the entire platform';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans for organizations';
COMMENT ON TABLE organization_subscriptions IS 'Current subscription status for each organization';
COMMENT ON TABLE subscription_history IS 'Audit trail of subscription changes';
COMMENT ON VIEW organization_statistics IS 'Aggregated statistics for superadmin dashboard';
