import { NextResponse } from "next/server";
import { loadTokens } from "@/lib/qb/token-store";

/**
 * GET /api/qb/status — Returns whether QuickBooks is connected (tokens stored).
 */
export async function GET() {
  try {
    const tokens = await loadTokens();
    if (!tokens) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({ connected: true, realmId: tokens.realmId });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
