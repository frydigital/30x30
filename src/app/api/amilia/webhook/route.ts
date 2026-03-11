import { createAdminClient } from "@/lib/supabase/admin";
import { extractSubdomain } from "@/lib/organizations/subdomain";
import type { AmiliaWebhookEvent, AmiliaSettings } from "@/lib/types";
import { randomBytes } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Generate a cryptographically secure random token for invitations.
 */
function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * POST /api/amilia/webhook
 *
 * Receives Amilia registration webhook events and automatically sends
 * an invite link to the registered person's email address.
 *
 * Webhook URL for admins to configure in Amilia:
 *   Production:  https://<org-slug>.30x30.app/api/amilia/webhook
 *   Development: http://localhost:3000/api/amilia/webhook?org=<org-slug>
 */
export async function POST(request: NextRequest) {
  // Identify the organization from the subdomain or query param
  const host = request.headers.get("host") || "";
  const { searchParams } = new URL(request.url);
  const orgSlug = extractSubdomain(host) || searchParams.get("org");

  if (!orgSlug) {
    return NextResponse.json(
      { error: "Organization context not found. Ensure the webhook URL includes the organization subdomain." },
      { status: 400 }
    );
  }

  // Parse webhook body
  let body: AmiliaWebhookEvent;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Only handle Registration Create events
  if (body.Context !== "Registration" || body.Action !== "Create") {
    return NextResponse.json(
      { message: `Event '${body.Context}/${body.Action}' is not handled` },
      { status: 200 }
    );
  }

  // Skip cancelled registrations
  if (body.Payload?.IsCancelled) {
    return NextResponse.json(
      { message: "Cancelled registration ignored" },
      { status: 200 }
    );
  }

  const supabase = createAdminClient();

  // Look up organization by slug
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .eq("is_active", true)
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Organization not found or inactive" },
      { status: 404 }
    );
  }

  // Load org Amilia settings for optional filtering
  const { data: orgSettings } = await supabase
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", org.id)
    .single();

  const amiliaSettings = (orgSettings?.settings as AmiliaSettings) ?? {};

  // Validate program ID if configured
  if (
    amiliaSettings.amilia_program_id != null &&
    body.Payload?.Program?.Id !== amiliaSettings.amilia_program_id
  ) {
    return NextResponse.json(
      {
        message: `Program ID ${body.Payload?.Program?.Id} does not match configured ID ${amiliaSettings.amilia_program_id}, event ignored`,
      },
      { status: 200 }
    );
  }

  // Validate activity ID if configured
  if (
    amiliaSettings.amilia_activity_id != null &&
    body.Payload?.Activity?.Id !== amiliaSettings.amilia_activity_id
  ) {
    return NextResponse.json(
      {
        message: `Activity ID ${body.Payload?.Activity?.Id} does not match configured ID ${amiliaSettings.amilia_activity_id}, event ignored`,
      },
      { status: 200 }
    );
  }

  // Extract the registrant's email
  const email = body.Payload?.Person?.Email;
  if (!email) {
    return NextResponse.json(
      { error: "Webhook payload is missing the registrant email" },
      { status: 400 }
    );
  }

  // Find the organization owner to use as invited_by
  const { data: owner, error: ownerError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", org.id)
    .eq("role", "owner")
    .limit(1)
    .single();

  if (ownerError || !owner) {
    console.error("Failed to find organization owner:", ownerError);
    return NextResponse.json(
      { error: "Organization owner not found" },
      { status: 500 }
    );
  }

  // Generate a fresh invitation token and 7-day expiry
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Upsert invitation — update token/expiry if one already exists for this email
  const { data: invitation, error: inviteError } = await supabase
    .from("organization_invitations")
    .upsert(
      {
        organization_id: org.id,
        email,
        role: "member",
        invited_by: owner.user_id,
        token,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "organization_id,email" }
    )
    .select("token")
    .single();

  if (inviteError || !invitation) {
    console.error("Failed to create invitation:", inviteError);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }

  // Build the invite URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://30x30.app";
  const inviteUrl = `${appUrl}/join?token=${invitation.token}`;

  // Log the webhook event
  await supabase.from("amilia_webhook_logs").insert({
    organization_id: org.id,
    registration_id: body.Payload.RegistrationId,
    program_id: body.Payload.Program?.Id ?? null,
    activity_id: body.Payload.Activity?.Id ?? null,
    person_email: email,
    person_name: body.Payload.Person?.FullName ?? null,
    event_time: body.EventTime,
    invite_url: inviteUrl,
  });

  return NextResponse.json({
    success: true,
    message: `Invitation created for ${email}`,
    inviteUrl,
  });
}
