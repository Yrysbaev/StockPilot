# StockPilot — Architecture & Product Design

## Product Concept Summary

**StockPilot** is an internal analytics agent for wholesale/distribution companies. It uses QuickBooks as the primary data source to answer business questions, surface insights, and recommend actions—not just display charts.

**Core value:**
- **Metrics** — KPIs and tables (revenue, profit, inventory, AR, customers).
- **Insights** — Plain-language explanations (e.g., “SKU CH0027 is a strong seller but margin is below category average”).
- **Actions** — Concrete recommendations (e.g., “Reduce purchase quantity next cycle by 20%”, “Follow up with this customer this week”).

**Design principles:**
- Executive-level, modern, clean UI; practical for daily operations.
- Rule-based insight engine in V1 (extensible to LLM later).
- Data model and sync layer designed for QuickBooks first, with room for more sources.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                             │
│  Next.js App Router │ React │ Tailwind │ shadcn/ui │ Recharts            │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION LAYER                            │
│  API Routes │ Server Components │ Client Components │ Global Date Filter │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                             ANALYTICS LAYER                             │
│  Metrics Service │ Insight Engine │ Alert Rules │ Ask Agent (structured) │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                  │
│  Raw QB Sync Tables │ Analytics-Ready Views/Tables │ PostgreSQL/Supabase  │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTEGRATION LAYER                              │
│  QuickBooks API Client │ Sync Jobs │ Webhooks (optional)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Separation of concerns:** Raw QuickBooks data lives in sync tables; analytics use derived/aggregated tables and views.
- **Reusable metrics:** Centralized functions for revenue, cost, gross profit, margin, velocity, weeks of supply, etc.
- **Modular insight engine:** Rules are pluggable; each rule outputs title, severity, explanation, action, entity, confidence.

---

## Data Architecture

### Source of Truth
- **Primary:** QuickBooks (Customers, Invoices, Invoice Lines, Items/Products, Inventory, Payments).
- **Future:** ERP, warehouse systems, CRM — added via adapters that normalize into the same core entities.

### Data Flow
1. **Ingest:** Sync job pulls from QuickBooks API into raw tables (`qb_*` or `raw_*`).
2. **Transform:** ETL or materialized views compute analytics-ready tables (by product, customer, time).
3. **Serve:** App reads from analytics tables + runs insight rules on top.

### QuickBooks Sync (High Level)
- **Entities to sync:** Customers, Items (products/services), Invoices, Invoice Lines, Payments, Inventory (quantity/value).
- **Strategy:** Full sync on first run; incremental by `MetaData.LastUpdatedTime` or similar.
- **Schedule:** Daily or hourly background job; optional webhooks for near-real-time.
- **Idempotency:** Use QuickBooks IDs; upsert by external ID to avoid duplicates.

---

## Database Schema (PostgreSQL)

### Core Entities (QuickBooks-aligned)

```sql
-- Products (from QB Items)
products (
  id UUID PRIMARY KEY,
  external_id VARCHAR UNIQUE NOT NULL,  -- QB Id
  sku VARCHAR,
  name VARCHAR NOT NULL,
  category VARCHAR,
  brand VARCHAR,
  unit VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Customers
customers (
  id UUID PRIMARY KEY,
  external_id VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Invoices (headers)
invoices (
  id UUID PRIMARY KEY,
  external_id VARCHAR UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  invoice_number VARCHAR,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount DECIMAL(18,2),
  balance_due DECIMAL(18,2),
  status VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Invoice line items
invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(18,4) NOT NULL,
  unit_price DECIMAL(18,4),
  amount DECIMAL(18,2),
  cost DECIMAL(18,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Payments
payments (
  id UUID PRIMARY KEY,
  external_id VARCHAR UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  payment_date DATE,
  amount DECIMAL(18,2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Inventory snapshots (from QB or manual)
inventory_snapshots (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  snapshot_date DATE NOT NULL,
  quantity_on_hand DECIMAL(18,4) NOT NULL,
  asset_value DECIMAL(18,2),
  created_at TIMESTAMPTZ,
  UNIQUE(product_id, snapshot_date)
);

-- Categories (optional, can be from QB or local)
categories (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE
);
```

### Analytics / Derived (materialized or computed)

- **product_metrics** — By product + date range: units_sold, revenue, cost, gross_profit, margin_pct, last_sold_date, trend vs prior period.
- **customer_metrics** — By customer + date range: revenue, gross_profit, order_count, aov, last_order_date, days_since_last_order, trend.
- **inventory_metrics** — By product: qty_on_hand, inventory_value, avg_monthly_sold, weeks_of_supply, days_since_last_sale.
- **ar_aging** — By customer: current, 1–30, 31–60, 61–90, 90+.

### Alerts / Insights

```sql
alerts (
  id UUID PRIMARY KEY,
  type VARCHAR NOT NULL,           -- inventory_risk, sales_opportunity, customer_retention, ar_risk, profitability
  severity VARCHAR NOT NULL,      -- low, medium, high, critical
  entity_type VARCHAR NOT NULL,   -- product | customer
  entity_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  explanation TEXT,
  suggested_action TEXT,
  supporting_metrics JSONB,
  confidence DECIMAL(3,2),
  generated_at TIMESTAMPTZ,
  link_path VARCHAR
);

insight_rules (
  id UUID PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  entity_type VARCHAR,
  is_active BOOLEAN DEFAULT true,
  config JSONB
);
```

---

## Pages & Components

| Page | Route | Purpose |
|------|--------|---------|
| Executive Overview | `/` | KPI cards, top 5 products/customers, biggest alerts/opportunities, date filter |
| Sales Dashboard | `/sales` | Units, revenue, profit, trends, category performance, no-sales/slow sellers |
| Inventory Dashboard | `/inventory` | Value, slow/dead stock, low stock, reorder/overstock suggestions |
| Profitability Dashboard | `/profitability` | Profit by product/category, margin, high/low margin highlights |
| Customer Dashboard | `/customers` | Top customers, inactive/at-risk/lost/new, health, actions |
| AR Dashboard | `/receivables` | Open invoices, aging, overdue, payment behavior |
| Alerts / Action Agent | `/alerts` | Prioritized alerts by category, severity, with actions and links |
| Ask the Analytics Agent | `/ask` | Natural-language-style Q&A with structured answers + tables + actions |
| Product Detail | `/products/[id]` | Trends, stock, alerts, top customers, recommended action |
| Customer Detail | `/customers/[id]` | Trends, orders, AR, status, alerts, top products |

### Reusable Components
- **KpiCard** — Metric value, label, trend, drill-down link.
- **DataTable** — Sortable, filterable, export CSV, pagination.
- **TrendChart** — Line/area for revenue, units, profit over time.
- **DateRangePicker** — Global presets (7/30/90 days, this/last month, custom).
- **InsightCard** — Title, severity, explanation, action, metrics.
- **AlertList** — Grouped by category, severity badges, links.
- **SearchBar** — By SKU, customer name.

---

## Insight Rules (V1 Rule Engine)

| Rule slug | Entity | Condition | Severity | Example action |
|-----------|--------|-----------|----------|----------------|
| dead_stock | product | Stock on hand and no sales in 60+ days | High | Reduce next purchase or promote |
| overstock | product | High stock, low sales velocity | Medium | Reduce order quantity |
| reorder | product | Low stock, good velocity | Medium | Reorder now |
| declining_margin | product | Margin down vs prior period | Medium | Review pricing/cost |
| customer_at_risk | customer | Order frequency drop or long gap | Medium | Follow up this week |
| customer_lost | customer | No orders in 90+ days | High | Reactivation campaign |
| low_margin_customer | customer | High revenue, low margin | Low | Improve mix or pricing |
| ar_overdue | customer | Overdue balance above threshold | High | Collections follow-up |
| high_ar_balance | customer | Large open AR | Medium | Payment reminder |

Each rule produces: title, severity, explanation, suggested_action, entity_type, entity_id, supporting_metrics, link_path.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Charts:** Recharts
- **Database:** PostgreSQL (Supabase for hosted option)
- **Sync:** Node script or API routes + cron for QuickBooks ingestion
- **State:** React state + URL (date range, filters) for shareable views

---

## File Structure (High Level)

```
/app
  /layout.tsx
  /page.tsx                    # Executive Overview
  /(dashboard)/
    /sales/page.tsx
    /inventory/page.tsx
    /profitability/page.tsx
    /customers/page.tsx
    /receivables/page.tsx
    /alerts/page.tsx
    /ask/page.tsx
    /products/[id]/page.tsx
    /customers/[id]/page.tsx
/components
  /ui/                         # shadcn
  /analytics/                  # KpiCard, DataTable, TrendChart, InsightCard
  /layout/                     # Sidebar, Header, DateFilter
/lib
  /data/                       # Mock data, types
  /metrics/                    # Revenue, profit, velocity, weeks of supply
  /insights/                   # Rule engine, alert generation
  /qb/                         # QuickBooks client (stub)
/types
  /index.ts
```

This document is the single source of truth for product concept, architecture, schema, and UX. Implementation will follow it.
