-- Multi-Tenancy Schema for 30x30 Challenge
-- Run this in your Supabase SQL Editor after running the base schema.sql

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
-- Organizations represent groups/teams that users can belong to
-- Each organization has a unique subdomain for access
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Used as subdomain (e.g., acme.30x30.app)
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3 AND length(slug) <= 63)
);

-- ============================================
-- ORGANIZATION ROLES ENUM
-- ============================================
-- Define roles for organization members
DO $$ BEGIN
  CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
-- Junction table linking users to organizations with roles
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role organization_role DEFAULT 'member' NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- A user can only be a member of an organization once
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- ORGANIZATION SETTINGS TABLE
-- ============================================
-- Store organization-specific settings, domains, and API keys
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  custom_domains TEXT[], -- Array of custom domains
  api_keys JSONB DEFAULT '[]'::jsonb, -- Store encrypted API keys
  settings JSONB DEFAULT '{}'::jsonb, -- Flexible settings storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION INVITATIONS TABLE
-- ============================================
-- Track pending invitations to organizations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role organization_role DEFAULT 'member' NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate active invitations
  UNIQUE(organization_id, email)
);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================
-- Add organization_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization_id to activities table for multi-tenant isolation
ALTER TABLE activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to daily_activities table
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to streaks table
ALTER TABLE streaks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_activities_organization ON daily_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_streaks_organization ON streaks(organization_id);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================
-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON organization_settings;
CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- Anyone can view active organizations (for signup/discovery)
DROP POLICY IF EXISTS "Active organizations are viewable by everyone" ON organizations;
CREATE POLICY "Active organizations are viewable by everyone" ON organizations
  FOR SELECT USING (is_active = true);

-- Only organization admins/owners can update organization details
DROP POLICY IF EXISTS "Organization admins can update organization" ON organizations;
CREATE POLICY "Organization admins can update organization" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- System can create organizations (via signup flow)
DROP POLICY IF EXISTS "System can create organizations" ON organizations;
CREATE POLICY "System can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- Organization members policies
-- Members can view other members in their organization
DROP POLICY IF EXISTS "Organization members can view other members" ON organization_members;
CREATE POLICY "Organization members can view other members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- System can create memberships (via signup/invitation)
DROP POLICY IF EXISTS "System can create organization memberships" ON organization_members;
CREATE POLICY "System can create organization memberships" ON organization_members
  FOR INSERT WITH CHECK (true);

-- Admins can update member roles
DROP POLICY IF EXISTS "Admins can update member roles" ON organization_members;
CREATE POLICY "Admins can update member roles" ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Admins can remove members (except owners can't be removed)
DROP POLICY IF EXISTS "Admins can remove members" ON organization_members;
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE USING (
    organization_members.role != 'owner' AND
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Organization settings policies
-- Admins/owners can view organization settings
DROP POLICY IF EXISTS "Admins can view organization settings" ON organization_settings;
CREATE POLICY "Admins can view organization settings" ON organization_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Admins/owners can update organization settings
DROP POLICY IF EXISTS "Admins can update organization settings" ON organization_settings;
CREATE POLICY "Admins can update organization settings" ON organization_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- System can create organization settings
DROP POLICY IF EXISTS "System can create organization settings" ON organization_settings;
CREATE POLICY "System can create organization settings" ON organization_settings
  FOR INSERT WITH CHECK (true);

-- Organization invitations policies
-- Members of organization can view pending invitations
DROP POLICY IF EXISTS "Members can view organization invitations" ON organization_invitations;
CREATE POLICY "Members can view organization invitations" ON organization_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Admins can create invitations
DROP POLICY IF EXISTS "Admins can create invitations" ON organization_invitations;
CREATE POLICY "Admins can create invitations" ON organization_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Admins can update invitations (e.g., mark as accepted)
DROP POLICY IF EXISTS "Admins can update invitations" ON organization_invitations;
CREATE POLICY "Admins can update invitations" ON organization_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Admins can delete invitations
DROP POLICY IF EXISTS "Admins can delete invitations" ON organization_invitations;
CREATE POLICY "Admins can delete invitations" ON organization_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- UPDATE EXISTING RLS POLICIES FOR MULTI-TENANCY
-- ============================================

-- Update activities policies to respect organization boundaries
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Update daily_activities policies
DROP POLICY IF EXISTS "Users can view own daily activities" ON daily_activities;
CREATE POLICY "Users can view own daily activities" ON daily_activities
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = daily_activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Allow organization members to view each other's daily activities
DROP POLICY IF EXISTS "Public users daily activities viewable by everyone" ON daily_activities;
CREATE POLICY "Organization members can view daily activities" ON daily_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = daily_activities.user_id AND profiles.is_public = true) OR
    (
      daily_activities.organization_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = daily_activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own daily activities" ON daily_activities;
CREATE POLICY "Users can insert own daily activities" ON daily_activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = daily_activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own daily activities" ON daily_activities;
CREATE POLICY "Users can update own daily activities" ON daily_activities
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = daily_activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own daily activities" ON daily_activities;
CREATE POLICY "Users can delete own daily activities" ON daily_activities
  FOR DELETE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = daily_activities.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Update streaks policies
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
CREATE POLICY "Users can view own streaks" ON streaks
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = streaks.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

-- Allow organization members to view each other's streaks
DROP POLICY IF EXISTS "Public users streaks viewable by everyone" ON streaks;
CREATE POLICY "Organization members can view streaks" ON streaks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = streaks.user_id AND profiles.is_public = true) OR
    (
      streaks.organization_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = streaks.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
CREATE POLICY "Users can update own streaks" ON streaks
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = streaks.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create a new organization
CREATE OR REPLACE FUNCTION create_organization(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_owner_id UUID;
BEGIN
  -- Use provided owner_id or current user
  v_owner_id := COALESCE(p_owner_id, auth.uid());
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner ID is required';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, description)
  VALUES (p_name, p_slug, p_description)
  RETURNING id INTO v_org_id;
  
  -- Add owner as first member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_owner_id, 'owner');
  
  -- Create organization settings
  INSERT INTO organization_settings (organization_id)
  VALUES (v_org_id);
  
  -- Update user's primary organization
  UPDATE profiles
  SET organization_id = v_org_id
  WHERE id = v_owner_id;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a member to an organization
CREATE OR REPLACE FUNCTION add_organization_member(
  p_organization_id UUID,
  p_user_id UUID,
  p_role organization_role DEFAULT 'member',
  p_invited_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
  v_inviter_id UUID;
BEGIN
  v_inviter_id := COALESCE(p_invited_by, auth.uid());
  
  -- Verify inviter has permission
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_inviter_id
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to add members';
  END IF;
  
  -- Add member
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (p_organization_id, p_user_id, p_role, v_inviter_id)
  RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization memberships
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  organization_avatar_url TEXT,
  member_role organization_role,
  joined_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.avatar_url,
    om.role,
    om.joined_at
  FROM organizations o
  INNER JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = v_user_id AND o.is_active = true
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission in organization
CREATE OR REPLACE FUNCTION has_organization_permission(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_required_role organization_role DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_role organization_role;
  v_role_hierarchy INT;
  v_required_hierarchy INT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get user's role
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Role hierarchy: owner=3, admin=2, member=1
  v_role_hierarchy := CASE v_user_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'member' THEN 1
    ELSE 0
  END;
  
  v_required_hierarchy := CASE p_required_role
    WHEN 'owner' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'member' THEN 1
    ELSE 0
  END;
  
  RETURN v_role_hierarchy >= v_required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to support organization context with validation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_org_exists BOOLEAN;
BEGIN
  -- Check if user is signing up with an organization context
  v_organization_id := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  
  -- Validate organization exists and is active if provided
  IF v_organization_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM organizations 
      WHERE id = v_organization_id AND is_active = true
    ) INTO v_org_exists;
    
    -- If organization doesn't exist or isn't active, clear the organization_id
    IF NOT v_org_exists THEN
      RAISE WARNING 'Organization % does not exist or is not active', v_organization_id;
      v_organization_id := NULL;
    END IF;
  END IF;
  
  -- Insert profile with username and validated organization from metadata
  INSERT INTO profiles (id, email, username, organization_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    v_organization_id
  );
  
  -- Insert streak record with organization context
  INSERT INTO streaks (user_id, current_streak, longest_streak, last_activity_date, organization_id)
  VALUES (NEW.id, 0, 0, NULL, v_organization_id);
  
  -- If valid organization context exists, add user as member
  IF v_organization_id IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_organization_id, NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the leaderboard view to be organization-aware
DROP VIEW IF EXISTS public_leaderboard;
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  s.current_streak,
  s.longest_streak,
  (SELECT COUNT(*) FROM daily_activities da WHERE da.user_id = p.id AND da.is_valid = true)::INTEGER as total_valid_days
FROM profiles p
JOIN streaks s ON p.id = s.user_id
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.is_public = true
ORDER BY s.current_streak DESC, s.longest_streak DESC, total_valid_days DESC;

-- Create organization leaderboard view with optimized query
CREATE OR REPLACE VIEW organization_leaderboard AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.organization_id,
  om.role as member_role,
  s.current_streak,
  s.longest_streak,
  COALESCE(da_counts.total_valid_days, 0)::INTEGER as total_valid_days
FROM profiles p
JOIN streaks s ON p.id = s.user_id
JOIN organization_members om ON p.id = om.user_id AND p.organization_id = om.organization_id
LEFT JOIN (
  SELECT 
    user_id, 
    organization_id,
    COUNT(*) as total_valid_days
  FROM daily_activities
  WHERE is_valid = true
  GROUP BY user_id, organization_id
) da_counts ON p.id = da_counts.user_id AND p.organization_id = da_counts.organization_id
WHERE p.organization_id IS NOT NULL
ORDER BY p.organization_id, s.current_streak DESC, s.longest_streak DESC, total_valid_days DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_organization TO authenticated;
GRANT EXECUTE ON FUNCTION add_organization_member TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION has_organization_permission TO authenticated;
