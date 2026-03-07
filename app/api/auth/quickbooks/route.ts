import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/qb";
import { randomBytes } from "crypto";

/**
 * GET /api/auth/quickbooks?redirect_uri=...
 * Returns the QuickBooks OAuth authorization URL with a state parameter (required by Intuit).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get("redirect_uri");
    if (!redirectUri) {
      return NextResponse.json(
        { error: "Missing redirect_uri query parameter" },
        { status: 400 }
      );
    }
    const state = searchParams.get("state") ?? randomBytes(24).toString("hex");
    const authUrl = getAuthorizationUrl({
      redirectUri,
      state,
    });
    return NextResponse.json({ authUrl, state });
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks auth error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
