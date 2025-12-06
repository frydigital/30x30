import { createClient } from "@/lib/supabase/server";
import { exchangeForAccessToken } from "@/lib/garmin/api";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const oauthToken = searchParams.get("oauth_token");
  const oauthVerifier = searchParams.get("oauth_verifier");

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.redirect(`${origin}/dashboard?error=garmin_denied`);
  }

  // Get stored token secret
  const cookieStore = await cookies();
  const storedToken = cookieStore.get("garmin_oauth_token")?.value;
  const storedTokenSecret = cookieStore.get("garmin_oauth_token_secret")?.value;

  if (oauthToken !== storedToken || !storedTokenSecret) {
    return NextResponse.redirect(`${origin}/dashboard?error=invalid_token`);
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  try {
    // Exchange for access token
    const tokens = await exchangeForAccessToken(oauthToken, storedTokenSecret, oauthVerifier);

    // Store Garmin connection in database
    const { error: upsertError } = await supabase
      .from("garmin_connections")
      .upsert({
        user_id: user.id,
        garmin_user_id: tokens.user_id || oauthToken, // Use token as fallback ID
        access_token: tokens.oauth_token,
        access_token_secret: tokens.oauth_token_secret,
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error storing Garmin connection:", upsertError);
      return NextResponse.redirect(`${origin}/dashboard?error=database_error`);
    }

    // Clear cookies
    const response = NextResponse.redirect(`${origin}/dashboard?success=garmin_connected`);
    response.cookies.delete("garmin_oauth_token");
    response.cookies.delete("garmin_oauth_token_secret");
    
    return response;
  } catch (err) {
    console.error("Garmin callback error:", err);
    return NextResponse.redirect(`${origin}/dashboard?error=garmin_error`);
  }
}
