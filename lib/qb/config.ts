/**
 * QuickBooks OAuth config from environment.
 * Required: QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET (in .env.local).
 */

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;

export const QB_SANDBOX = process.env.QUICKBOOKS_SANDBOX !== "false";

export function getQuickBooksConfig(): {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
} {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing QuickBooks credentials. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in .env.local (see .env.example)."
    );
  }
  return {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    sandbox: QB_SANDBOX,
  };
}

export function hasQuickBooksConfig(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}
