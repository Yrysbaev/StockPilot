/**
 * QuickBooks OAuth 2.0 helpers.
 * - Build authorization URL for "Connect to QuickBooks".
 * - Exchange authorization code for access + refresh tokens.
 * - Refresh access token when expired.
 * Store tokens securely (e.g. DB per realm); this module does not persist them.
 */

import { getQuickBooksConfig } from "./config";

const SANDBOX = {
  authorize: "https://appcenter.intuit.com/connect/oauth2",
  token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  revoke: "https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke",
};
const PRODUCTION = {
  authorize: "https://appcenter.intuit.com/connect/oauth2",
  token: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  revoke: "https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke",
};

const DEFAULT_SCOPES = "com.intuit.quickbooks.accounting";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  x_refresh_token_expires_in: number;
}

/**
 * Build the URL to send the user to for "Connect to QuickBooks".
 * After they authorize, QB redirects to redirectUri with ?code=...&realmId=...
 */
export function getAuthorizationUrl(options: {
  redirectUri: string;
  state?: string;
  scopes?: string;
}): string {
  const { clientId, sandbox } = getQuickBooksConfig();
  const base = sandbox ? SANDBOX.authorize : PRODUCTION.authorize;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: options.scopes ?? DEFAULT_SCOPES,
    redirect_uri: options.redirectUri,
  });
  if (options.state) params.set("state", options.state);
  return `${base}?${params.toString()}`;
}

/**
 * Exchange the authorization code (from redirect) for access_token and refresh_token.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const { clientId, clientSecret, sandbox } = getQuickBooksConfig();
  const tokenUrl = sandbox ? SANDBOX.token : PRODUCTION.token;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Refresh the access token using the stored refresh_token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const { clientId, clientSecret, sandbox } = getQuickBooksConfig();
  const tokenUrl = sandbox ? SANDBOX.token : PRODUCTION.token;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token refresh failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/**
 * Revoke a refresh token (e.g. on disconnect).
 */
export async function revokeToken(token: string): Promise<void> {
  const { clientId, clientSecret, sandbox } = getQuickBooksConfig();
  const revokeUrl = sandbox ? SANDBOX.revoke : PRODUCTION.revoke;

  const body = new URLSearchParams({ token });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(revokeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks revoke failed: ${res.status} ${text}`);
  }
}
