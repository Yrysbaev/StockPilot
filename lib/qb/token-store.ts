/**
 * File-based token store for QuickBooks OAuth (dev / single-company).
 * Tokens are saved to .data/qb-tokens.json (gitignored).
 */

import { promises as fs } from "fs";
import path from "path";
import { refreshAccessToken } from "./auth";

const DATA_DIR = path.join(process.cwd(), ".data");
const TOKENS_FILE = path.join(DATA_DIR, "qb-tokens.json");

export interface StoredTokens {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms; we refresh 5 min before
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await fs.readFile(TOKENS_FILE, "utf-8");
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Returns a valid access token, refreshing if needed. Throws if no tokens or refresh fails.
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  realmId: string;
}> {
  const stored = await loadTokens();
  if (!stored) {
    throw new Error("Not connected to QuickBooks. Connect your company first.");
  }

  const now = Date.now();
  if (stored.expiresAt - REFRESH_BUFFER_MS > now) {
    return { accessToken: stored.accessToken, realmId: stored.realmId };
  }

  const refreshed = await refreshAccessToken(stored.refreshToken);
  const expiresAt = now + refreshed.expires_in * 1000;
  await saveTokens({
    realmId: stored.realmId,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt,
  });
  return { accessToken: refreshed.access_token, realmId: stored.realmId };
}

export async function clearTokens(): Promise<void> {
  try {
    await fs.unlink(TOKENS_FILE);
  } catch {
    // ignore
  }
}
