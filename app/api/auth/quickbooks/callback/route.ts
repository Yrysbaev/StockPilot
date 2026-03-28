import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/qb";
import { saveTokens } from "@/lib/qb/token-store";

/**
 * GET /api/auth/quickbooks/callback?code=...&realmId=...
 * QuickBooks redirects here after the user authorizes. We exchange the code for tokens
 * and save them to .data/qb-tokens.json (so sync can use them).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const realmId = searchParams.get("realmId");
    const redirectUri = searchParams.get("redirect_uri");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    if (!code) {
      return NextResponse.redirect(
        `${baseUrl}/settings?qb_error=${encodeURIComponent("Missing authorization code from QuickBooks")}`
      );
    }
    const defaultRedirectUri = `${baseUrl}/api/auth/quickbooks/callback`;
    const finalRedirectUri = redirectUri || defaultRedirectUri;

    const tokens = await exchangeCodeForTokens(code, finalRedirectUri);
    const effectiveRealmId = realmId ?? "unknown";

    await saveTokens({
      realmId: effectiveRealmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });

    return NextResponse.redirect(
      `${baseUrl}/settings?qb_connected=1&realm=${encodeURIComponent(effectiveRealmId)}`
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks callback error";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/settings?qb_error=${encodeURIComponent(message)}`
    );
  }
}
