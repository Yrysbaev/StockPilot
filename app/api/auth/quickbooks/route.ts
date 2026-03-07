import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/qb";

/**
 * GET /api/auth/quickbooks?redirect_uri=...
 * Returns the QuickBooks OAuth authorization URL.
 * redirect_uri must match the one configured in your Intuit app (e.g. http://localhost:3000/api/auth/quickbooks/callback).
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
    const authUrl = getAuthorizationUrl({
      redirectUri,
      state: searchParams.get("state") ?? undefined,
    });
    return NextResponse.json({ authUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks auth error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
