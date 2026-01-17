-- Fix for infinite recursion in organization_members RLS policies
-- Run this to update the RLS policies to use a helper function

-- Create a helper function to check membership without triggering RLS
CREATE OR REPLACE FUNCTION is_organization_member(
  p_organization_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_user_id
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_organization_member TO authenticated;
GRANT EXECUTE ON FUNCTION is_organization_member TO anon;

-- Now update the RLS policies to use this function instead of subqueries

-- Organization members policies - use direct comparison instead of EXISTS
DROP POLICY IF EXISTS "Organization members can view other members" ON organization_members;
CREATE POLICY "Organization members can view other members" ON organization_members
  FOR SELECT USING (
    is_organization_member(organization_id, auth.uid())
  );

-- Update activities policies
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own activities" ON activities;
CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

-- Update daily_activities policies
DROP POLICY IF EXISTS "Users can view own daily activities" ON daily_activities;
CREATE POLICY "Users can view own daily activities" ON daily_activities
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own daily activities" ON daily_activities;
CREATE POLICY "Users can insert own daily activities" ON daily_activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own daily activities" ON daily_activities;
CREATE POLICY "Users can update own daily activities" ON daily_activities
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own daily activities" ON daily_activities;
CREATE POLICY "Users can delete own daily activities" ON daily_activities
  FOR DELETE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

-- Update streaks policies
DROP POLICY IF EXISTS "Users can view own streaks" ON streaks;
CREATE POLICY "Users can view own streaks" ON streaks
  FOR SELECT USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own streaks" ON streaks;
CREATE POLICY "Users can update own streaks" ON streaks
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (
      organization_id IS NULL OR 
      is_organization_member(organization_id, auth.uid())
    )
  );

-- Update organization settings policies
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

-- Update organization invitations policies
DROP POLICY IF EXISTS "Members can view organization invitations" ON organization_invitations;
CREATE POLICY "Members can view organization invitations" ON organization_invitations
  FOR SELECT USING (
    is_organization_member(organization_id, auth.uid())
  );

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
