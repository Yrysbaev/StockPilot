# StockPilot

Internal analytics agent for wholesale/distribution companies. Uses QuickBooks as the primary data source to answer business questions, surface insights, and recommend actions.

## Features

- **Executive Overview** — KPIs, top products/customers, biggest alerts and opportunities
- **Sales Dashboard** — Units, revenue, profit, trends, category performance
- **Inventory Dashboard** — Value, slow/dead stock, low stock, reorder suggestions
- **Profitability Dashboard** — Profit by product/category, margin analysis
- **Customer Dashboard** — Top customers, at-risk/lost/new, health status
- **Accounts Receivable** — Open invoices, aging, overdue by customer
- **Alerts & Action Agent** — Prioritized alerts with explanations and suggested actions
- **Ask the Analytics Agent** — Natural-language-style Q&A with structured answers
- **Product & Customer detail pages** — Drill-down with trends and recommendations

## Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- shadcn-style UI (Radix), Recharts
- Mock data layer (ready to swap for QuickBooks API + PostgreSQL)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Build:** `npm run build` then `npm start`
- **Lint:** `npm run lint`

## Deploy (Vercel)

1. Push to GitHub, then import the repo at [vercel.com](https://vercel.com).
2. Add env vars: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` (your app URL).
3. Deploy. Use `https://your-app.vercel.app` in Intuit for redirect URI, EULA, and Privacy URLs.

See **DEPLOYMENT.md** for details and notes on QuickBooks token persistence on serverless.

## Data & QuickBooks Sync

The app currently uses **mock data** in `lib/data/`. To connect QuickBooks:

1. Add `QUICKBOOKS_CLIENT_ID` and `QUICKBOOKS_CLIENT_SECRET` to `.env.local` (see `.env.example`).
2. Use the **auth helper** in `lib/qb/`: `getAuthorizationUrl()`, `exchangeCodeForTokens()`, `refreshAccessToken()`, and the API client `qbQuery()` / `qbGet()`.
3. Optional: `GET /api/auth/quickbooks?redirect_uri=...` returns an OAuth URL; configure your Intuit app redirect URI to `https://your-domain/api/auth/quickbooks/callback`.
4. See **docs/ARCHITECTURE.md** for data model and **docs/QUICKBOOKS_SYNC.md** for sync design and token storage.

Sync flow: QuickBooks API → raw tables → analytics/metrics layer → dashboards and insight engine.

## Project Structure

- `app/` — Pages (Executive, Sales, Inventory, Profitability, Customers, AR, Alerts, Ask, Product/Customer detail)
- `components/` — UI (shadcn-style) and analytics (KpiCard, DataTable, InsightCard)
- `lib/` — Data (mock), metrics (product, customer, inventory, AR), insights (rules, ask-agent)
- `types/` — Shared TypeScript types
- `contexts/` — Date range (global filter)
- `docs/` — Architecture and QuickBooks sync

## License

Private / internal use.
