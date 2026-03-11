import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/create-organization";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "30x30.app";
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const metadata = data.user.user_metadata ?? {};

      // --- Create pending organization (create-org flow) ---
      if (metadata.pending_org_name && metadata.pending_org_slug) {
        const { data: orgId, error: rpcError } = await supabase.rpc(
          "create_organization",
          {
            p_name: metadata.pending_org_name,
            p_slug: metadata.pending_org_slug,
            p_description: metadata.pending_org_description ?? null,
          }
        );

        if (!rpcError && orgId) {
          // Clear pending org metadata so a refresh doesn't re-create it
          const { error: clearError } = await supabase.auth.updateUser({
            data: {
              pending_org_name: null,
              pending_org_slug: null,
              pending_org_description: null,
            },
          });
          if (clearError) {
            console.error("[auth/callback] Failed to clear pending org metadata:", clearError.message);
          }

          const slug: string = metadata.pending_org_slug;
          const orgDashboardUrl = isLocalEnv
            ? `${origin}/dashboard?org=${slug}`
            : `https://${slug}.${baseDomain}/dashboard`;

          return NextResponse.redirect(orgDashboardUrl);
        }
      }

      // --- Accept pending invitation (join-org flow) ---
      if (metadata.pending_invitation_token) {
        const token: string = metadata.pending_invitation_token;

        // Look up the org slug separately for type safety
        const { data: inv } = await supabase
          .from("organization_invitations")
          .select("organization_id")
          .eq("token", token)
          .is("accepted_at", null)
          .single();

        if (inv?.organization_id) {
          const { data: invOrg } = await supabase
            .from("organizations")
            .select("slug")
            .eq("id", inv.organization_id)
            .single();

          // Mark invitation accepted
          await supabase
            .from("organization_invitations")
            .update({ accepted_at: new Date().toISOString() })
            .eq("token", token);

          // Clear token from metadata
          const { error: clearInvError } = await supabase.auth.updateUser({
            data: { pending_invitation_token: null },
          });
          if (clearInvError) {
            console.error("[auth/callback] Failed to clear invitation token metadata:", clearInvError.message);
          }

          if (invOrg?.slug) {
            const orgDashboardUrl = isLocalEnv
              ? `${origin}/dashboard?org=${invOrg.slug}`
              : `https://${invOrg.slug}.${baseDomain}/dashboard`;
            return NextResponse.redirect(orgDashboardUrl);
          }
        }
      }

      // --- Redirect to org dashboard if user has an organization (join-org flow) ---
      if (metadata.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("slug")
          .eq("id", metadata.organization_id)
          .single();

        if (org?.slug) {
          const orgDashboardUrl = isLocalEnv
            ? `${origin}/dashboard?org=${org.slug}`
            : `https://${org.slug}.${baseDomain}/dashboard`;
          return NextResponse.redirect(orgDashboardUrl);
        }
      }

      // Default redirect
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
