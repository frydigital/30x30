"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { 
  createOrganization, 
  validateOrganizationSlug, 
  generateSlugFromName 
} from "@/lib/organizations";
import { buildOrganizationUrl } from "@/lib/organizations/subdomain";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setCheckingAuth(false);

      if (!user) {
        // Redirect to signup with return URL
        router.push('/signup?return=/create-organization');
      }
    };

    checkAuth();
  }, [router]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlugFromName(name)) {
      const newSlug = generateSlugFromName(value);
      setSlug(newSlug);
      validateSlug(newSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleanSlug);
    validateSlug(cleanSlug);
  };

  const validateSlug = (slugValue: string) => {
    const validation = validateOrganizationSlug(slugValue);
    setSlugError(validation.valid ? null : validation.error || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate slug
    const validation = validateOrganizationSlug(slug);
    if (!validation.valid) {
      setSlugError(validation.error || "Invalid slug");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      // Create organization
      const { data: organization, error: createError } = await createOrganization(
        supabase,
        {
          name,
          slug,
          description: description || undefined,
        }
      );

      if (createError) throw createError;
      if (!organization) throw new Error("Failed to create organization");

      // Redirect to organization dashboard
      const orgUrl = buildOrganizationUrl(organization.slug);
      window.location.href = `${orgUrl}/dashboard`;
    } catch (err) {
      console.error("Error creating organization:", err);
      const error = err as { message?: string; code?: string };
      if (error.message?.includes('duplicate') || error.code === '23505') {
        setError("This organization slug is already taken. Please choose another.");
      } else {
        setError(error.message || "Failed to create organization. Please try again.");
      }
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>
            Set up a new organization to track team challenges and manage members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                The display name for your organization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Organization URL *</Label>
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
                  Your organization will be accessible at: <strong>{slug}.30x30.app</strong>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                3-63 characters, lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="A community of fitness enthusiasts..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                A brief description of your organization
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !name || !slug || !!slugError}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating organization...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/dashboard">
                  Cancel
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                You&apos;ll be set as the organization owner and can invite members after creation.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
