-- Challenge Settings Migration for 30x30 Challenge
-- Run this in your Supabase SQL Editor after running multi-tenancy-schema.sql
-- Adds challenge configuration fields to the organizations table

-- ============================================
-- ADD CHALLENGE SETTINGS COLUMNS TO ORGANIZATIONS
-- ============================================

-- Challenge date range
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS challenge_start_date DATE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS challenge_end_date DATE;

-- Allowed activity types (e.g., ['running', 'cycling', 'swimming', 'any'])
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_activity_types TEXT[] DEFAULT ARRAY['any']::TEXT[];

-- Terms of use that members must accept before joining
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS terms_of_use TEXT;

-- Whether the organization allows public (open) signup without invitation
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_signup BOOLEAN DEFAULT true;

-- Custom homepage/welcome content for the organization's join page
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS homepage_content TEXT;

-- ============================================
-- CONSTRAINT: end date must be after start date
-- ============================================
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS challenge_dates_valid;
ALTER TABLE organizations ADD CONSTRAINT challenge_dates_valid
  CHECK (
    challenge_start_date IS NULL
    OR challenge_end_date IS NULL
    OR challenge_end_date >= challenge_start_date
  );
