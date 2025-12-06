import { createClient } from "@/lib/supabase/server";
import { getStravaAuthUrl } from "@/lib/strava/api";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate a state parameter for CSRF protection
  const state = randomBytes(16).toString("hex");
  
  // Store state in a cookie for verification
  const response = NextResponse.redirect(getStravaAuthUrl(state));
  response.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
