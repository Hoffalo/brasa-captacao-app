import { getToken } from "next-auth/jwt";
import { loadConfig } from "@/config";

export class NotSignedInError extends Error {
  constructor() {
    super("Sessão expirada. Entre de novo com a sua conta da BRASA.");
    this.name = "NotSignedInError";
  }
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// Refresh a minute early so a token never expires halfway through a request.
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Returns a valid Google access token for the person calling the API route.
 * Google tokens last one hour and the conference lasts a full day, so an expired token is
 * refreshed here with the stored refresh token instead of sending the person back to login.
 */
export async function googleAccessToken(request: Request): Promise<string> {
  const config = loadConfig();
  const secureCookie = new URL(request.url).protocol === "https:";
  const token = await getToken({ req: request, secret: config.authSecret, secureCookie });
  if (!token || typeof token.accessToken !== "string") throw new NotSignedInError();

  const expiresAtMs = typeof token.expiresAt === "number" ? token.expiresAt * 1000 : 0;
  if (expiresAtMs - EXPIRY_MARGIN_MS > Date.now()) return token.accessToken;
  if (typeof token.refreshToken !== "string") throw new NotSignedInError();
  return refreshAccessToken(token.refreshToken, config.googleClientId, config.googleClientSecret);
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new NotSignedInError();
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new NotSignedInError();
  return body.access_token;
}
