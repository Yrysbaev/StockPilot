/**
 * QuickBooks API client for authenticated requests.
 * Uses realmId (company id) and accessToken from your token storage.
 */

const API_BASE_SANDBOX = "https://sandbox-quickbooks.api.intuit.com/v3";
const API_BASE_PROD = "https://quickbooks.api.intuit.com/v3";

export interface QBClientOptions {
  realmId: string;
  accessToken: string;
  sandbox?: boolean;
}

/**
 * Make a GET request to QuickBooks API.
 * Automatically uses company (realm) base URL.
 */
export async function qbGet<T = unknown>(
  options: QBClientOptions,
  path: string,
  query?: Record<string, string>
): Promise<T> {
  const base = options.sandbox !== false ? API_BASE_SANDBOX : API_BASE_PROD;
  const url = new URL(`company/${options.realmId}/${path.replace(/^\//, "")}`, base);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error("QuickBooks access token expired or invalid. Refresh the token.");
  }
  if (res.status === 403) {
    const text = await res.text();
    const apiMode = options.sandbox !== false ? "sandbox" : "production";
    throw new Error(
      `QuickBooks API error: 403 Forbidden (${apiMode} API). ${text.slice(0, 400)} ` +
        `If you use a live (non-sandbox) company, set QUICKBOOKS_SANDBOX=false in env. ` +
        `If you use a sandbox company only, set QUICKBOOKS_SANDBOX=true (default) or omit it.`
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Run a QuickBooks query (e.g. SELECT * FROM Customer).
 * Handles pagination: returns all pages by following QueryResponse.QueryResponse.startPosition.
 */
export async function qbQuery<T = { [key: string]: unknown }>(
  options: QBClientOptions,
  query: string
): Promise<T[]> {
  const all: T[] = [];
  let startPosition = 1;
  const maxCount = 1000;

  for (;;) {
    const q = `${query} STARTPOSITION ${startPosition} MAXRESULTS ${maxCount}`;
    const data = await qbGet<{ QueryResponse?: { [key: string]: T[] }; Fault?: unknown }>(
      options,
      "query",
      { query: q }
    );

    if (data.Fault) {
      throw new Error(`QuickBooks query fault: ${JSON.stringify(data.Fault)}`);
    }

    const qr = data.QueryResponse;
    if (!qr) {
      break;
    }

    // QueryResponse can have keys like "Customer", "Invoice", "Item", etc.
    const keys = Object.keys(qr).filter((k) => Array.isArray(qr[k]));
    if (keys.length === 0) break;
    const rows = qr[keys[0]] as T[];
    if (rows.length === 0) break;

    all.push(...rows);
    if (rows.length < maxCount) break;
    startPosition += rows.length;
  }

  return all;
}

/**
 * Fetch company info (useful to verify realmId and token).
 */
export async function qbGetCompany(
  options: QBClientOptions
): Promise<{ CompanyInfo: { CompanyName?: string; Id?: string } }> {
  return qbGet(options, `companyinfo/${options.realmId}`);
}
