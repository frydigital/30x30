"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Mail, User, Building2, Lock } from "lucide-react";
import { getOrganizationInvitation } from "@/lib/organizations";
import { extractSubdomain } from "@/lib/organizations/subdomain";

interface OrgContext {
  name: string;
  slug: string;
  id: string;
  terms_of_use: string | null;
  homepage_content: string | null;
  public_signup: boolean;
}

function JoinOrganizationContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);

  // Load organization context and invitation
  useEffect(() => {
    const loadContext = async () => {
      const supabase = createClient();

      // Check for invitation token
      const token = searchParams.get("token");
      setInvitationToken(token);

      if (token) {
        // Load invitation details
        const { data: invitation } = await getOrganizationInvitation(supabase, token);
        if (invitation) {
          setOrgContext({
            name: invitation.organization.name,
            slug: invitation.organization.slug,
            id: invitation.organization.id,
            terms_of_use: invitation.organization.terms_of_use,
            homepage_content: invitation.organization.homepage_content,
            public_signup: invitation.organization.public_signup !== false,
          });
          setEmail(invitation.email);
        }
      } else {
        // Try to get organization from subdomain or query param
        const hostname = window.location.hostname;
        const slug = extractSubdomain(hostname) || searchParams.get("org");

        if (slug) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name, slug, terms_of_use, homepage_content, public_signup")
            .eq("slug", slug)
            .eq("is_active", true)
            .single();

          if (org) {
            setOrgContext({
              id: org.id,
              name: org.name,
              slug: org.slug,
              terms_of_use: org.terms_of_use ?? null,
              homepage_content: org.homepage_content ?? null,
              public_signup: org.public_signup !== false,
            });
          }
        }
      }

      setContextLoading(false);
    };

    loadContext();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgContext) return;

    // Require terms acceptance if terms are set
    if (orgContext.terms_of_use && !termsAccepted) {
      setError("Please accept the terms of use to continue.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: {
          username: username || null,
          organization_id: orgContext.id,
          // Store invitation token in metadata so the callback can accept it
          ...(invitationToken ? { pending_invitation_token: invitationToken } : {}),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!orgContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                No organization specified. Please use an invitation link or
                access from an organization subdomain.
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

  // Block public access if public signup is disabled and there's no invitation token
  if (!orgContext.public_signup && !invitationToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">{orgContext.name}</h2>
              <p className="text-muted-foreground">
                This challenge is invite-only. Please use the invitation link
                you received to join.
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

  // --- Check-email state ---
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <h2 className="text-2xl font-bold">Check your email!</h2>
              <p className="text-muted-foreground">
                We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to confirm your account and join{" "}
                <strong>{orgContext.name}</strong>.
              </p>
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Homepage / welcome content */}
        {orgContext.homepage_content && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {orgContext.homepage_content}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Join {orgContext.name}
            </CardTitle>
            <CardDescription>
              Create your account to participate in the 30x30 challenge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="email">Email *</Label>
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

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              {/* Terms of Use */}
              {orgContext.terms_of_use && (
                <div className="space-y-2">
                  <Label>Terms of Use</Label>
                  <div className="rounded-md border bg-muted/50 p-3 max-h-40 overflow-y-auto">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {orgContext.terms_of_use}
                    </p>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-input"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="text-sm text-muted-foreground">
                      I have read and agree to the terms of use
                    </span>
                  </label>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !email ||
                  !password ||
                  (!!orgContext.terms_of_use && !termsAccepted)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Join Challenge"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                We&apos;ll send you a confirmation link to activate your account.
              </p>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline hover:text-foreground">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function JoinOrganizationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <JoinOrganizationContent />
    </Suspense>
  );
}
