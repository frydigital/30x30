export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  invited_by: string | null;
  invited_at: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  custom_domains: string[] | null;
  api_keys: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StravaConnection {
  id: string;
  user_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}

export type ActivitySource = 'strava' | 'manual';

export interface Activity {
  id: string;
  user_id: string;
  source: ActivitySource;
  external_activity_id: string | null;
  activity_date: string; // YYYY-MM-DD format
  duration_minutes: number;
  activity_type: string;
  activity_name: string;
  notes: string | null;
  organization_id: string | null;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string; // YYYY-MM-DD format
  total_duration_minutes: number;
  is_valid: boolean; // true if >= 30 minutes
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  organization_id: string | null;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  current_streak: number;
  longest_streak: number;
  total_valid_days: number;
}

export interface OrganizationLeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  organization_id: string;
  member_role: OrganizationRole;
  current_streak: number;
  longest_streak: number;
  total_valid_days: number;
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  organization_avatar_url: string | null;
  member_role: OrganizationRole;
  joined_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id" | "created_at">>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OrganizationMember, "id" | "created_at">>;
      };
      organization_settings: {
        Row: OrganizationSettings;
        Insert: Omit<OrganizationSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OrganizationSettings, "id" | "created_at">>;
      };
      organization_invitations: {
        Row: OrganizationInvitation;
        Insert: Omit<OrganizationInvitation, "id" | "created_at">;
        Update: Partial<Omit<OrganizationInvitation, "id" | "created_at">>;
      };
      strava_connections: {
        Row: StravaConnection;
        Insert: Omit<StravaConnection, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<StravaConnection, "id" | "created_at">>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at">;
        Update: Partial<Omit<Activity, "id" | "created_at">>;
      };
      daily_activities: {
        Row: DailyActivity;
        Insert: Omit<DailyActivity, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DailyActivity, "id" | "created_at">>;
      };
      streaks: {
        Row: Streak;
        Insert: Omit<Streak, "id" | "updated_at">;
        Update: Partial<Omit<Streak, "id">>;
      };
    };
  };
}
