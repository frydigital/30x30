"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: username || null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">30x30 Challenge</CardTitle>
          <CardDescription>
            Track your 30-minute daily activity streak for 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-lg font-medium">Check your email!</h3>
              <p className="text-muted-foreground">
                We&apos;ve sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to sign in.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="mt-4"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Optional - used to display your name on the leaderboard
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
                    Sending magic link...
                  </>
                ) : (
                  "Sign in with Magic Link"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No password needed. We&apos;ll send you a link to sign in.
              </p>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Leaderboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
