# QuickBooks Data Sync

This document describes how to sync QuickBooks data into StockPilot so the analytics layer can use it.

## Overview

- **Source:** QuickBooks Online API (or QuickBooks Desktop via a bridge).
- **Target:** Your database (e.g. PostgreSQL / Supabase) with tables aligned to the schema in **ARCHITECTURE.md**.
- **Flow:** Sync job (scheduled or on-demand) pulls from QuickBooks, upserts into raw/analytics tables; the app reads from those tables (or from the same metrics functions fed by real data).

## QuickBooks API

1. **App registration** — Create an app in [Intuit Developer](https://developer.intuit.com) to get Client ID and Client Secret. Store them in environment variables (never in code):
   - `QUICKBOOKS_CLIENT_ID`
   - `QUICKBOOKS_CLIENT_SECRET`
   - Copy `.env.example` to `.env.local`, add your values, and keep `.env.local` out of version control (it’s in `.gitignore`).
2. **OAuth 2.0** — Use OAuth 2.0 to connect each company (realm) and obtain access/refresh tokens. Store tokens securely and refresh before expiry.
3. **Endpoints** — Use the QuickBooks Online API v3 REST endpoints for:
   - **Customers** — `GET /v3/company/{realmId}/query?query=SELECT * FROM Customer`
   - **Items (products)** — `GET /v3/company/{realmId}/query?query=SELECT * FROM Item WHERE Type = 'Inventory' OR Type = 'NonInventory'`
   - **Invoices** — `GET /v3/company/{realmId}/query?query=SELECT * FROM Invoice`
   - **Invoice line items** — Each Invoice response includes `Line` array; map to `invoice_items` with ItemRef, Qty, UnitPrice, Amount. Cost may require Item cost or a separate lookup.
   - **Payments** — `GET /v3/company/{realmId}/query?query=SELECT * FROM Payment`
   - **Inventory** — Quantity On Hand and Asset value may come from Item or from Inventory quantity reports, depending on your QuickBooks setup.

## What to Sync

| QB Entity   | Map to          | Key fields to store                          |
|------------|-----------------|-----------------------------------------------|
| Customer   | customers       | Id, DisplayName, PrimaryEmailAddr, Active     |
| Item       | products        | Id, Sku, Name, Type, QtyOnHand, AssetAccountRef (for value) |
| Invoice    | invoices        | Id, CustomerRef, DocNumber, TxnDate, DueDate, TotalAmt, Balance |
| Line       | invoice_items   | Link to Invoice + ItemRef, Qty, UnitPrice, Amount; cost from Item or estimate |
| Payment    | payments        | Id, CustomerRef, TotalAmt, TxnDate            |

Use **QB Id** as `external_id`; keep your own `id` (e.g. UUID) for internal relations.

## Sync Strategy

1. **Full sync (first time)** — Query all of each entity type; insert or update by `external_id`.
2. **Incremental** — Use `MetaData.LastUpdatedTime` (or equivalent) to fetch only entities updated since last run. QuickBooks supports filtering by `WHERE MetaData.LastUpdatedTime > '...'`.
3. **Schedule** — Run sync daily or hourly (e.g. cron or a queue job). For near–real time, consider webhooks if your QB plan supports them.
4. **Idempotency** — Always upsert by `external_id` so re-runs don’t duplicate rows.

## Auth helper (this repo)

The app includes a QuickBooks OAuth helper in `lib/qb/`:

- **Config** — `getQuickBooksConfig()` reads `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET` from env; throws if missing.
- **Auth** — `getAuthorizationUrl({ redirectUri })`, `exchangeCodeForTokens(code, redirectUri)`, `refreshAccessToken(refreshToken)`.
- **Client** — `qbGet(options, path, query)`, `qbQuery(options, "SELECT * FROM Customer")`, `qbGetCompany(options)`.

Use `QBClientOptions`: `{ realmId, accessToken, sandbox? }`. Store tokens per company (realm) in your DB; this code does not persist them.

**API routes (optional):**

- `GET /api/auth/quickbooks?redirect_uri=...` — Returns `{ authUrl }` to send the user to QuickBooks to connect.
- `GET /api/auth/quickbooks/callback?code=...&realmId=...` — Exchange code for tokens; returns JSON. Configure this URL as the redirect URI in your Intuit app.

## Where to Put Sync Code

- **Option A:** Node script (e.g. `scripts/sync-quickbooks.ts`) that uses a QB client, connects to your DB, and runs the sync. Invoke via cron or a job runner.
- **Option B:** API routes (e.g. `/api/sync`) protected by auth that trigger the same sync logic. Call from a scheduler (e.g. Vercel Cron, external cron hitting your API).
- **Option C:** Separate worker service that runs the sync and writes to the same database the Next.js app uses.

## After Sync

- The **metrics layer** (`lib/metrics/`) expects data in the shape of the entities in `types/index.ts` (products, customers, invoices, invoice_items, payments, inventory_snapshots).
- Point the metrics and insight engine at your database (or at an API that returns the same shapes). Replace the mock data in `lib/data/` with calls to your DB or API so the dashboards and “Ask the Agent” use live QuickBooks-backed data.

## Security

- Store OAuth tokens and API keys in environment variables or a secrets manager.
- Use a dedicated QB app with minimal scopes required for read (e.g. `com.intuit.quickbooks.accounting`).
- Restrict sync endpoints or scripts to authorized environments and identities.
