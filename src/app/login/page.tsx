"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";

type LoginMode = "password" | "magic-link" | "magic-link-sent";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("password");

  // --- Password login ---
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user) {
      // After login, redirect to user's organization if they have one
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organizations(slug)")
        .eq("user_id", data.user.id)
        .limit(1);

      const firstOrg = (memberships?.[0]?.organizations as { slug: string } | { slug: string }[] | null | undefined);
      const slug = firstOrg && !Array.isArray(firstOrg) ? firstOrg.slug : Array.isArray(firstOrg) ? firstOrg[0]?.slug : null;
      if (slug) {
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        if (baseDomain && !appUrl.includes("localhost")) {
          window.location.href = `https://${slug}.${baseDomain}/dashboard`;
        } else {
          window.location.href = `/dashboard?org=${slug}`;
        }
      } else {
        window.location.href = "/create-organization";
      }
    }
  };

  // --- Magic link (OTP) ---
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Only existing users
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMode("magic-link-sent");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">30x30 Challenge</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Magic-link sent confirmation */}
          {mode === "magic-link-sent" ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <h3 className="text-lg font-medium">Check your email!</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a sign-in link to <strong>{email}</strong>.
                  Click the link to sign in — no password needed.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode("password");
                  setError(null);
                }}
              >
                Back to sign in
              </Button>
            </div>
          ) : mode === "password" ? (
            /* --- Password form (primary) --- */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Magic link alternative */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode("magic-link");
                  setError(null);
                }}
              >
                Send sign-in link instead
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    New here?
                  </span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/create-organization">Create a challenge</Link>
              </Button>
            </form>
          ) : (
            /* --- Magic link form --- */
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a sign-in link — no
                password required.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email-magic">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email-magic"
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
                    Sending link…
                  </>
                ) : (
                  "Send Sign-In Link"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode("password");
                  setError(null);
                }}
              >
                Back to password sign in
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
