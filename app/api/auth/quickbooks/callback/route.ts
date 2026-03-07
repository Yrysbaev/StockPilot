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

    if (!code) {
      return NextResponse.json(
        { error: "Missing code (QuickBooks did not return an authorization code)" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.url.split("/api")[0];
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

    return NextResponse.json({
      success: true,
      realmId: effectiveRealmId,
      message: "Connected. You can now run Sync to pull data.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks callback error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
