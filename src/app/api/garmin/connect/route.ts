import { createClient } from "@/lib/supabase/server";
import { getRequestToken, getGarminAuthUrl } from "@/lib/garmin/api";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get request token from Garmin
    const { oauth_token, oauth_token_secret } = await getRequestToken();
    
    // Store token secret in a cookie for verification in callback
    const response = NextResponse.redirect(getGarminAuthUrl(oauth_token));
    response.cookies.set("garmin_oauth_token", oauth_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });
    response.cookies.set("garmin_oauth_token_secret", oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    return response;
  } catch (err) {
    console.error("Garmin connect error:", err);
    return NextResponse.json({ error: "Failed to connect to Garmin" }, { status: 500 });
  }
}
