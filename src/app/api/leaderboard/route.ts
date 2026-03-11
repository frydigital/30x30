import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { extractSubdomain } from "@/lib/organizations/subdomain";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = request.headers.get("host") || "";
    
    // Get org slug from subdomain or query param
    const orgSlug = extractSubdomain(hostname) || searchParams.get("org");

    if (!orgSlug) {
      return NextResponse.json({ error: "Organization not specified" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Look up the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .eq("is_active", true)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch leaderboard using admin client to bypass RLS.
    // Only safe, public-facing fields are selected (no emails or private data).
    // This endpoint is intentionally public: the leaderboard is meant to be
    // visible to anyone visiting the organization's splash page.
    const { data: leaderboard, error } = await supabase
      .from("organization_leaderboard")
      .select("user_id, username, member_role, current_streak, longest_streak, total_valid_days")
      .eq("organization_id", org.id)
      .order("current_streak", { ascending: false })
      .order("longest_streak", { ascending: false })
      .order("total_valid_days", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Leaderboard fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    return NextResponse.json({ leaderboard: leaderboard ?? [] });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
