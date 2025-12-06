import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/strava/api";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard?error=strava_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard?error=invalid_request`);
  }

  // Verify state parameter
  const cookieStore = await cookies();
  const storedState = cookieStore.get("strava_oauth_state")?.value;
  
  if (state !== storedState) {
    return NextResponse.redirect(`${origin}/dashboard?error=invalid_state`);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store/update Strava connection in database
    const { error: upsertError } = await supabase
      .from("strava_connections")
      .upsert({
        user_id: user.id,
        strava_athlete_id: tokens.athlete?.id || 0,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error storing Strava connection:", upsertError);
      return NextResponse.redirect(`${origin}/dashboard?error=database_error`);
    }

    // Update avatar if available
    if (tokens.athlete?.profile) {
      await supabase
        .from("profiles")
        .update({ 
          avatar_url: tokens.athlete.profile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Clear the state cookie
    const response = NextResponse.redirect(`${origin}/dashboard?success=strava_connected`);
    response.cookies.delete("strava_oauth_state");
    
    return response;
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(`${origin}/dashboard?error=strava_error`);
  }
}
