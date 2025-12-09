import { createClient } from "@/lib/supabase/server";
import { getStravaAuthUrl } from "@/lib/strava/api";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasStravaConfig =
    process.env.STRAVA_CLIENT_ID &&
    process.env.STRAVA_CLIENT_SECRET &&
    process.env.STRAVA_CLIENT_ID !== "your_strava_client_id" &&
    appUrl;

  // Ensure Strava is configured server-side to avoid opaque redirect errors
  if (!hasStravaConfig) {
    return NextResponse.json(
      {
        error:
          "Strava is not configured. Please set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and either NEXT_PUBLIC_APP_URL or VERCEL_URL.",
      },
      { status: 503 }
    );
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
