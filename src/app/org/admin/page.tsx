"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Users, Settings, Mail, UserX, Shield } from "lucide-react";
import { 
  getOrganizationMembers, 
  createOrganizationInvitation, 
  updateMemberRole, 
  removeOrganizationMember,
  getOrganizationBySlug
} from "@/lib/organizations";
import { extractSubdomain } from "@/lib/organizations/subdomain";
import type { OrganizationMember, Organization, OrganizationRole } from "@/lib/types";

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

        // Check user's role
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', org.id)
          .eq('user_id', user.id)
          .single();

        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
          setError('You do not have permission to access this page');
          setLoading(false);
          return;
        }

        setUserRole(member.role);

        // Load members
        const { data: membersData, error: membersError } = await getOrganizationMembers(supabase, org.id);
        if (membersError) throw membersError;
        
        setMembers(membersData || []);
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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{organization?.name}</h1>
              <p className="text-muted-foreground">Organization Administration</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
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
      </div>
    </div>
  );
}
