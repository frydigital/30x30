"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, CheckCircle, Mail, User, Building2 } from "lucide-react";
import { getOrganizationInvitation, acceptOrganizationInvitation } from "@/lib/organizations";
import { extractSubdomain } from "@/lib/organizations/subdomain";

function JoinOrganizationContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [organizationSlug, setOrganizationSlug] = useState<string>("");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  // Load organization context and invitation
  useEffect(() => {
    const loadContext = async () => {
      const supabase = createClient();
      
      // Check for invitation token
      const token = searchParams.get('token');
      setInvitationToken(token);

      if (token) {
        // Load invitation details
        const { data: invitation } = await getOrganizationInvitation(supabase, token);
        if (invitation) {
          setOrganizationName(invitation.organization.name);
          setOrganizationSlug(invitation.organization.slug);
          setEmail(invitation.email);
        }
      } else {
        // Try to get organization from subdomain
        const hostname = window.location.hostname;
        const slug = extractSubdomain(hostname) || searchParams.get('org');
        
        if (slug) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name, slug')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();
          
          if (org) {
            setOrganizationName(org.name);
            setOrganizationSlug(org.slug);
          }
        }
      }
    };

    loadContext();
  }, [searchParams]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // Get organization ID
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', organizationSlug)
        .single();

      if (!org) throw new Error('Organization not found');

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            username: username || null,
            organization_id: org.id,
          },
        },
      });

      if (authError) throw authError;

      setSent(true);
    } catch (err) {
      console.error('Error sending OTP:', err);
      const error = err as { message?: string };
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: verifyError, data } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      // If there's an invitation token, accept it
      if (invitationToken && data.user) {
        const { error: acceptError } = await acceptOrganizationInvitation(
          supabase,
          invitationToken,
          data.user.id
        );

        if (acceptError) {
          console.error('Error accepting invitation:', acceptError);
          // Don't fail the whole flow, user is already created
        }
      }

      // Redirect to organization dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error verifying OTP:', err);
      const error = err as { message?: string };
      setError(error.message || 'Invalid verification code. Please try again.');
      setVerifying(false);
    }
  };

  if (!organizationSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                No organization specified. Please use an invitation link or access from an organization subdomain.
              </p>
              <Button variant="outline" asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Join {organizationName}
          </CardTitle>
          <CardDescription>
            Create your account to start tracking your 30x30 challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <h3 className="text-lg font-medium">Check your email!</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-center block">Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                      disabled={verifying}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                {error && (
                  <div className="text-sm text-destructive text-center">{error}</div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifying || otp.length !== 6}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Join Organization"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSent(false);
                    setOtp('');
                    setError(null);
                  }}
                  className="w-full"
                  disabled={verifying}
                >
                  Use a different email
                </Button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username (optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Display name for the leaderboard
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading || !!invitationToken}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Join Organization"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No password needed. We&apos;ll send you a 6-digit code.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinOrganizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <JoinOrganizationContent />
    </Suspense>
  );
}
