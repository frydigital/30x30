// Garmin Connect OAuth configuration
// Note: Garmin uses OAuth 1.0a, which is more complex than OAuth 2.0
import crypto from "crypto";

export const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY!;
export const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET!;
export const GARMIN_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + "/api/garmin/callback";

export const GARMIN_REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
export const GARMIN_AUTH_URL = "https://connect.garmin.com/oauthConfirm";
export const GARMIN_ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
export const GARMIN_API_URL = "https://apis.garmin.com";

export interface GarminTokens {
  oauth_token: string;
  oauth_token_secret: string;
  user_id?: string;
}

export interface GarminActivity {
  activityId: number;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  startTimeGMT: string;
  duration: number; // in seconds
  distance: number; // in meters
}

// OAuth 1.0a signature generation helper
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // For Node.js environment using crypto module
  const hmac = crypto.createHmac("sha1", signingKey);
  hmac.update(signatureBaseString);
  return hmac.digest("base64");
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

export async function getRequestToken(): Promise<{ oauth_token: string; oauth_token_secret: string }> {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    oauth_callback: GARMIN_REDIRECT_URI,
  };

  const signature = generateOAuthSignature(
    "POST",
    GARMIN_REQUEST_TOKEN_URL,
    oauthParams,
    GARMIN_CONSUMER_SECRET
  );

  oauthParams.oauth_signature = signature;

  const authHeader =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
      .join(", ");

  const response = await fetch(GARMIN_REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get request token from Garmin");
  }

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    oauth_token: params.get("oauth_token")!,
    oauth_token_secret: params.get("oauth_token_secret")!,
  };
}

export function getGarminAuthUrl(oauthToken: string): string {
  return `${GARMIN_AUTH_URL}?oauth_token=${encodeURIComponent(oauthToken)}`;
}

export async function exchangeForAccessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<GarminTokens> {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_token: oauthToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    oauth_verifier: oauthVerifier,
  };

  const signature = generateOAuthSignature(
    "POST",
    GARMIN_ACCESS_TOKEN_URL,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
    oauthTokenSecret
  );

  oauthParams.oauth_signature = signature;

  const authHeader =
    "OAuth " +
    Object.entries(oauthParams)
      .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
      .join(", ");

  const response = await fetch(GARMIN_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to exchange for access token");
  }

  const text = await response.text();
  const params = new URLSearchParams(text);

  return {
    oauth_token: params.get("oauth_token")!,
    oauth_token_secret: params.get("oauth_token_secret")!,
  };
}

export async function getActivities(
  accessToken: string,
  accessTokenSecret: string,
  startTime?: number,
  endTime?: number
): Promise<GarminActivity[]> {
  const url = `${GARMIN_API_URL}/wellness-api/rest/activities`;
  const timestamp = generateTimestamp();
  const nonce = generateNonce();

  const queryParams: Record<string, string> = {};
  if (startTime) queryParams.uploadStartTimeInSeconds = startTime.toString();
  if (endTime) queryParams.uploadEndTimeInSeconds = endTime.toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: GARMIN_CONSUMER_KEY,
    oauth_token: accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
    ...queryParams,
  };

  const signature = generateOAuthSignature(
    "GET",
    url,
    oauthParams,
    GARMIN_CONSUMER_SECRET,
    accessTokenSecret
  );

  const oauthHeaderParams = { ...oauthParams };
  delete oauthHeaderParams.uploadStartTimeInSeconds;
  delete oauthHeaderParams.uploadEndTimeInSeconds;
  oauthHeaderParams.oauth_signature = signature;

  const authHeader =
    "OAuth " +
    Object.entries(oauthHeaderParams)
      .map(([key, value]) => `${encodeURIComponent(key)}="${encodeURIComponent(value)}"`)
      .join(", ");

  const queryString = Object.keys(queryParams).length > 0
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";

  const response = await fetch(`${url}${queryString}`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch activities from Garmin");
  }

  return response.json();
}
