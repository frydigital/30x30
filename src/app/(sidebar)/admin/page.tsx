"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createOrganizationInvitation,
  getOrganizationBySlug,
  getOrganizationMembers,
  getOrganizationSettings,
  removeOrganizationMember,
  updateMemberRole,
  updateOrganization,
  updateOrganizationSettings
} from "@/lib/organizations";
import { extractSubdomain } from "@/lib/organizations/subdomain";
import { createClient } from "@/lib/supabase/client";
import type { AmiliaSettings, Organization, OrganizationMember, OrganizationRole } from "@/lib/types";
import { CalendarDays, Loader2, Mail, Settings, Shield, Users, UserX, Webhook } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ACTIVITY_TYPE_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "walking", label: "Walking" },
  { value: "hiking", label: "Hiking" },
  { value: "gym", label: "Gym / Strength Training" },
  { value: "yoga", label: "Yoga" },
  { value: "sports", label: "Sports" },
  { value: "any", label: "Any Activity" },
];

export default function OrganizationAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<(OrganizationMember & { profile: { id: string; email: string; username: string | null; avatar_url: string | null } })[]>([]);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Challenge settings state
  const [challengeStartDate, setChallengeStartDate] = useState("");
  const [challengeEndDate, setChallengeEndDate] = useState("");
  const [allowedActivityTypes, setAllowedActivityTypes] = useState<string[]>(["any"]);
  const [termsOfUse, setTermsOfUse] = useState("");
  const [publicSignup, setPublicSignup] = useState(true);
  const [homepageContent, setHomepageContent] = useState("");
  const [savingChallenge, setSavingChallenge] = useState(false);

  // Amilia integration state
  const [amiliaProgramId, setAmiliaProgramId] = useState("");
  const [amiliaActivityId, setAmiliaActivityId] = useState("");
  const [savingAmilia, setSavingAmilia] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Load organization and check permissions
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Get organization slug from subdomain
        const hostname = window.location.hostname;
        const slug = extractSubdomain(hostname) || new URLSearchParams(window.location.search).get('org');

        if (!slug) {
          setError('No organization context found');
          setLoading(false);
          return;
        }

        // Load organization
        const { data: org, error: orgError } = await getOrganizationBySlug(supabase, slug);
        if (orgError) throw orgError;
        if (!org) throw new Error('Organization not found');

        setOrganization(org);

        // Populate challenge settings from loaded org
        setChallengeStartDate(org.challenge_start_date ?? "");
        setChallengeEndDate(org.challenge_end_date ?? "");
        setAllowedActivityTypes(org.allowed_activity_types?.length ? org.allowed_activity_types : ["any"]);
        setTermsOfUse(org.terms_of_use ?? "");
        setPublicSignup(org.public_signup !== false);
        setHomepageContent(org.homepage_content ?? "");

        // Check user's role
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', org.id)
          .eq('user_id', user.id)
          .single();

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
          setOrganization(null);
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }

        setUserRole(member.role);

        // Load members
        const { data: membersData, error: membersError } = await getOrganizationMembers(supabase, org.id);
        if (membersError) throw membersError;

        setMembers(membersData || []);

        // Build the webhook URL for this organization
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || '30x30.app';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const wUrl = isLocalhost
          ? `${window.location.origin}/api/amilia/webhook?org=${slug}`
          : `https://${slug}.${baseDomain}/api/amilia/webhook`;
        setWebhookUrl(wUrl);

        // Load Amilia settings
        const { data: orgSettings } = await getOrganizationSettings(supabase, org.id);
        if (orgSettings?.settings) {
          const settings = orgSettings.settings as AmiliaSettings;
          setAmiliaProgramId(settings.amilia_program_id?.toString() ?? "");
          setAmiliaActivityId(settings.amilia_activity_id?.toString() ?? "");
        }
      } catch (err) {
        console.error('Error loading data:', err);
        const error = err as { message?: string };
        setError(error.message || 'Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      const { data: invitation, error: inviteError } = await createOrganizationInvitation(
        supabase,
        {
          organizationId: organization.id,
          email: inviteEmail,
          role: inviteRole,
        }
      );

      if (inviteError) throw inviteError;

      // Build invitation URL using environment variable or fallback
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const inviteUrl = `${baseUrl}/join?token=${invitation?.token}`;

      setSuccess(`Invitation sent! Share this link: ${inviteUrl}`);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      console.error('Error inviting member:', err);
      const error = err as { message?: string };
      if (error.message?.includes('duplicate')) {
        setError('An invitation has already been sent to this email');
      } else {
        setError(error.message || 'Failed to send invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: OrganizationRole) => {
    if (!organization) return;

    const supabase = createClient();

    try {
      const { error } = await updateMemberRole(supabase, memberId, newRole);
      if (error) throw error;

      // Refresh members
      const { data: membersData } = await getOrganizationMembers(supabase, organization.id);
      setMembers(membersData || []);
      setSuccess('Member role updated successfully');
    } catch (err) {
      console.error('Error updating role:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    const supabase = createClient();

    try {
      const { error } = await removeOrganizationMember(supabase, memberId);
      if (error) throw error;

      // Refresh members
      const { data: membersData } = await getOrganizationMembers(supabase, organization.id);
      setMembers(membersData || []);
      setSuccess('Member removed successfully');
    } catch (err) {
      console.error('Error removing member:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to remove member');
    }
  };

  const toggleActivityType = (value: string) => {
    setAllowedActivityTypes((prev) => {
      // Selecting "any" clears all specific selections
      if (value === "any") {
        return ["any"];
      }
      const withoutAny = prev.filter((t) => t !== "any");
      if (withoutAny.includes(value)) {
        // Deselecting the last specific type falls back to "any"
        const next = withoutAny.filter((t) => t !== value);
        return next.length === 0 ? ["any"] : next;
      }
      return [...withoutAny, value];
    });
  };

  const handleSaveChallengeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setSavingChallenge(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      const { error } = await updateOrganization(supabase, organization.id, {
        challenge_start_date: challengeStartDate || null,
        challenge_end_date: challengeEndDate || null,
        allowed_activity_types: allowedActivityTypes,
        terms_of_use: termsOfUse || null,
        public_signup: publicSignup,
        homepage_content: homepageContent || null,
      });

      if (error) throw error;

      setSuccess('Challenge settings saved successfully');
      // Refresh org data
      const { data: updatedOrg } = await getOrganizationBySlug(supabase, organization.slug);
      if (updatedOrg) setOrganization(updatedOrg);
    } catch (err) {
      console.error('Error saving challenge settings:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to save challenge settings');
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleSaveAmiliaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setSavingAmilia(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    try {
      // Load existing settings to merge with Amilia fields
      const { data: existing } = await getOrganizationSettings(supabase, organization.id);
      const currentSettings = (existing?.settings as Record<string, unknown>) ?? {};

      const programIdValue = amiliaProgramId ? parseInt(amiliaProgramId, 10) : null;
      const activityIdValue = amiliaActivityId ? parseInt(amiliaActivityId, 10) : null;

      if (programIdValue !== null && isNaN(programIdValue)) {
        throw new Error('Program ID must be a valid number');
      }
      if (activityIdValue !== null && isNaN(activityIdValue)) {
        throw new Error('Activity ID must be a valid number');
      }

      const updatedSettings: AmiliaSettings = {
        amilia_program_id: programIdValue,
        amilia_activity_id: activityIdValue,
      };

      const { error: saveError } = await updateOrganizationSettings(supabase, organization.id, {
        settings: { ...currentSettings, ...updatedSettings },
      });

      if (saveError) throw saveError;

      setSuccess('Amilia integration settings saved successfully');
    } catch (err) {
      console.error('Error saving Amilia settings:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to save Amilia settings');
    } finally {
      setSavingAmilia(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="w-12 h-12 mx-auto text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>

      <div className="flex items-center gap-3 py-4">
        <h1 className="text-3xl font-bold">{organization?.name}</h1>
        <p className="text-muted-foreground">Organization Administration</p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Challenge Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <CardTitle>Challenge Settings</CardTitle>
          </div>
          <CardDescription>
            Configure the challenge dates, allowed activities, and sign-up options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveChallengeSettings} className="space-y-6">
            {/* Date range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="challengeStartDate">Challenge Start Date</Label>
                <Input
                  id="challengeStartDate"
                  type="date"
                  value={challengeStartDate}
                  onChange={(e) => setChallengeStartDate(e.target.value)}
                  disabled={savingChallenge}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challengeEndDate">Challenge End Date</Label>
                <Input
                  id="challengeEndDate"
                  type="date"
                  value={challengeEndDate}
                  onChange={(e) => setChallengeEndDate(e.target.value)}
                  min={challengeStartDate || undefined}
                  disabled={savingChallenge}
                />
              </div>
            </div>

            {/* Allowed activity types */}
            <div className="space-y-2">
              <Label>Allowed Activity Types</Label>
              <p className="text-xs text-muted-foreground">
                Select which activities count toward the challenge. Choose &quot;Any Activity&quot; to allow all.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {ACTIVITY_TYPE_OPTIONS.map((option) => {
                  const isChecked = allowedActivityTypes.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => toggleActivityType(option.value)}
                        disabled={savingChallenge}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Public signup toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Public Sign-Up</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow anyone to join this challenge from the home page without an invitation
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publicSignup}
                onClick={() => setPublicSignup((v) => !v)}
                disabled={savingChallenge}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                  publicSignup ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    publicSignup ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Terms of use */}
            <div className="space-y-2">
              <Label htmlFor="termsOfUse">Terms of Use</Label>
              <p className="text-xs text-muted-foreground">
                Members will be required to accept these terms before joining. Leave blank for no terms.
              </p>
              <Textarea
                id="termsOfUse"
                placeholder="Enter your challenge terms of use here..."
                value={termsOfUse}
                onChange={(e) => setTermsOfUse(e.target.value)}
                disabled={savingChallenge}
                rows={5}
              />
            </div>

            {/* Homepage content */}
            <div className="space-y-2">
              <Label htmlFor="homepageContent">Welcome / Homepage Content</Label>
              <p className="text-xs text-muted-foreground">
                Custom message shown on your organization&apos;s join page. Supports plain text.
              </p>
              <Textarea
                id="homepageContent"
                placeholder="Welcome to our challenge! Here's what you need to know..."
                value={homepageContent}
                onChange={(e) => setHomepageContent(e.target.value)}
                disabled={savingChallenge}
                rows={4}
              />
            </div>

            <Button type="submit" disabled={savingChallenge}>
              {savingChallenge ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Challenge Settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invite Member Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <CardTitle>Invite Members</CardTitle>
          </div>
          <CardDescription>
            Send invitations to new members to join your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  disabled={inviting}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  {userRole === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={inviting || !inviteEmail}>
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending invitation...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <CardTitle>Members ({members.length})</CardTitle>
          </div>
          <CardDescription>
            Manage your organization members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.profile?.username || member.profile?.email || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.profile?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value as OrganizationRole)}
                    disabled={member.role === 'owner' && userRole !== 'owner'}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {userRole === 'owner' && <option value="owner">Owner</option>}
                  </select>
                  {member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <UserX className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amilia Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            <CardTitle>Amilia Integration</CardTitle>
          </div>
          <CardDescription>
            Configure the Amilia webhook to automatically invite registrants to your organization.
            When a user registers through Amilia, they will receive an invite link by email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <p className="text-xs text-muted-foreground">
                Copy this URL into your Amilia account under <strong>Settings → Webhooks</strong>.
                Amilia will POST registration events to this endpoint.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setSuccess('Webhook URL copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            {/* Amilia filter settings */}
            <form onSubmit={handleSaveAmiliaSettings} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionally restrict which registrations trigger an invite by providing a Program ID
                and/or Activity ID from Amilia. Leave blank to accept all registrations.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amiliaProgramId">Amilia Program ID (optional)</Label>
                  <Input
                    id="amiliaProgramId"
                    type="number"
                    placeholder="e.g. 1"
                    value={amiliaProgramId}
                    onChange={(e) => setAmiliaProgramId(e.target.value)}
                    disabled={savingAmilia}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amiliaActivityId">Amilia Activity ID (optional)</Label>
                  <Input
                    id="amiliaActivityId"
                    type="number"
                    placeholder="e.g. 2"
                    value={amiliaActivityId}
                    onChange={(e) => setAmiliaActivityId(e.target.value)}
                    disabled={savingAmilia}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cancelled registrations (<code>IsCancelled: true</code>) are always ignored automatically.
              </p>
              <Button type="submit" disabled={savingAmilia}>
                {savingAmilia ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Amilia Settings'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Organization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <CardTitle>Organization Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your organization details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <p className="text-sm font-medium">{organization?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Subdomain</Label>
              <p className="text-sm font-medium">{organization?.slug}.30x30.app</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground">
                {organization?.description || 'No description'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
</>
  );
}
