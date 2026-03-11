"use client";

import { AlertCircle, Building2, CheckCircle, Flame, Loader2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganization,
  generateSlugFromName,
  validateOrganizationSlug,
} from "@/lib/organizations";
import { buildOrganizationDashboardUrl } from "@/lib/organizations/subdomain";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "signup" | "check-email" | "create-org";

export default function CreateOrganizationPage() {
  const [step, setStep] = useState<Step>("loading");

  // Org fields (shared between both states)
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  // Account fields (unauthenticated signup only)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time password confirmation validation
  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStep(user ? "create-org" : "signup");
    };
    checkAuth(); // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate slug from org name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlugFromName(name)) {
      const newSlug = generateSlugFromName(value);
      setSlug(newSlug);
      validateSlug(newSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(clean);
    validateSlug(clean);
  };

  const validateSlug = (value: string) => {
    const result = validateOrganizationSlug(value);
    setSlugError(result.valid ? null : result.error ?? null);
  };

  // Shared org fields rendered inline (avoids hook-inside-component issues)
  const renderOrgFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Organization Name *</Label>
        <Input
          id="name"
          type="text"
          placeholder="Acme Fitness Club"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          disabled={loading}
          className="text-lg"
        />
        <p className="text-xs text-muted-foreground">
          The display name for your challenge organization
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Challenge URL *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="slug"
            type="text"
            placeholder="acme-fitness"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            disabled={loading}
            className={slugError ? "border-destructive" : ""}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            .30x30.app
          </span>
        </div>
        {slugError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {slugError}
          </div>
        )}
        {!slugError && slug && (
          <p className="text-xs text-muted-foreground">
            Your challenge will be at: <strong>{slug}.30x30.app</strong>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          3–63 characters, lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          type="text"
          placeholder="A community of fitness enthusiasts…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>
    </>
  );

  // --- Signup + org creation (unauthenticated) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const validation = validateOrganizationSlug(slug);
    if (!validation.valid) {
      setSlugError(validation.error ?? "Invalid URL");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: {
          username: username || null,
          pending_org_name: name,
          pending_org_slug: slug,
          pending_org_description: description || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setStep("check-email");
    }
    setLoading(false);
  };

  // --- Create org (authenticated) ---
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateOrganizationSlug(slug);
    if (!validation.valid) {
      setSlugError(validation.error ?? "Invalid URL");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: organization, error: createError } = await createOrganization(supabase, {
        name,
        slug,
        description: description || undefined,
      });

      if (createError) throw createError;
      if (!organization) throw new Error("Failed to create organization");

      window.location.href = buildOrganizationDashboardUrl(organization.slug);
    } catch (err) {
      const e = err as { message?: string; code?: string };
      if (e.message?.includes("duplicate") || e.code === "23505") {
        setError("This challenge URL is already taken. Please choose another.");
      } else {
        setError(e.message || "Failed to create organization. Please try again.");
      }
      setLoading(false);
    }
  };

  // --- Loading state ---
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Check-email state ---
  if (step === "check-email") {
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
                Click the link in the email to activate your account. Your
                organization <strong>{name}</strong> will be created
                automatically once confirmed.
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

  // --- Authenticated: create org only ---
  if (step === "create-org") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">30x30 Challenge</span>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Building2 className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Create Your Challenge</CardTitle>
              <CardDescription>
                Set up a new organization to host a 30-day fitness challenge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrg} className="space-y-6">
                {renderOrgFields()}

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !name || !slug || !!slugError}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating organization…
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </Button>

                <Button type="button" variant="outline" className="w-full" asChild>
                  <Link href="/">Cancel</Link>
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  You&apos;ll be set as the owner and can invite members after creation.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Unauthenticated: combined signup + org creation ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold">30x30 Challenge</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create a Challenge</CardTitle>
            <CardDescription>
              Set up your organization and admin account to host a 30-day fitness challenge
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Organization section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Organization Details
                </p>
                <div className="space-y-4">{renderOrgFields()}</div>
              </div>

              {/* Account section */}
              <div className="border-t pt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Your Account
                </p>
                <div className="space-y-4">
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
                      Your display name on the leaderboard
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
                        disabled={loading}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className={passwordMismatch ? "border-destructive" : ""}
                    />
                    {passwordMismatch && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !name ||
                  !slug ||
                  !!slugError ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  passwordMismatch
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account & Organization"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                We&apos;ll send you a confirmation link to activate your account and
                create your organization.
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
