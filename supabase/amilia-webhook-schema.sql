-- Amilia Webhook Integration Schema
-- Run this in your Supabase SQL Editor after running multi-tenancy-schema.sql.

-- ============================================
-- AMILIA WEBHOOK LOGS TABLE
-- ============================================
-- Stores a record of every Amilia registration webhook that was processed.
-- This provides an audit trail for admins.
CREATE TABLE IF NOT EXISTS amilia_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  registration_id TEXT,
  program_id INTEGER,
  activity_id INTEGER,
  person_email TEXT NOT NULL,
  person_name TEXT,
  event_time TIMESTAMPTZ,
  invite_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by organization
CREATE INDEX IF NOT EXISTS idx_amilia_webhook_logs_organization
  ON amilia_webhook_logs(organization_id);

-- Index for quick lookup by email (useful for debugging duplicate invites)
CREATE INDEX IF NOT EXISTS idx_amilia_webhook_logs_email
  ON amilia_webhook_logs(person_email);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE amilia_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Org admins and owners can view logs for their organization
CREATE POLICY "Org admins view amilia logs"
  ON amilia_webhook_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Superadmins can view all logs
CREATE POLICY "Superadmins view all amilia logs"
  ON amilia_webhook_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM superadmins WHERE user_id = auth.uid())
  );

-- Service role inserts from webhook handler (bypasses RLS automatically)
-- No explicit policy needed; the service role client bypasses RLS.
