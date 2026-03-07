// Core entities (QuickBooks-aligned)
export interface Product {
  id: string;
  externalId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  externalId: string;
  name: string;
  email: string | null;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  externalId: string;
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  cost: number;
}

export interface Payment {
  id: string;
  externalId: string;
  customerId: string;
  paymentDate: string;
  amount: number;
}

export interface InventorySnapshot {
  id: string;
  productId: string;
  snapshotDate: string;
  quantityOnHand: number;
  assetValue: number;
}

/** Data bundle for analytics (from /api/data or mock). */
export interface AnalyticsData {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  inventorySnapshots: InventorySnapshot[];
}

// Analytics / computed
export type DateRangePreset = "7d" | "30d" | "90d" | "this_month" | "last_month" | "custom";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
  preset?: DateRangePreset;
}

export interface ProductMetrics {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  brand: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  grossMarginPct: number;
  avgSellingPrice: number;
  avgCost: number;
  lastSoldDate: string | null;
  trendVsPriorPct: number | null; // e.g. 15 = +15% vs prior period
}

export interface CustomerMetrics {
  customerId: string;
  customerName: string;
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
  orderCount: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  trendVsPriorPct: number | null;
  status: "active" | "at_risk" | "lost" | "new";
}

export interface InventoryMetrics {
  productId: string;
  sku: string;
  productName: string;
  category: string;
  quantityOnHand: number;
  inventoryValue: number;
  inventoryValueSharePct: number;
  avgMonthlyUnitsSold: number;
  avgWeeklyUnitsSold: number;
  daysSinceLastSale: number | null;
  lastSoldDate: string | null;
  weeksOfSupply: number | null;
  reorderStatus: "ok" | "low" | "reorder" | "critical";
  overstockRisk: "none" | "low" | "medium" | "high";
  isDeadStock: boolean;
  isSlowMoving: boolean;
}

export interface ARAgingRow {
  customerId: string;
  customerName: string;
  openBalance: number;
  current: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61to90: number;
  overdue90Plus: number;
  openInvoiceCount: number;
  lastPaymentDate: string | null;
  riskFlag: "low" | "medium" | "high";
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertCategory =
  | "inventory_risk"
  | "sales_opportunity"
  | "customer_retention"
  | "cash_flow"
  | "profitability";

export interface Alert {
  id: string;
  type: AlertCategory;
  severity: AlertSeverity;
  entityType: "product" | "customer";
  entityId: string;
  entityName: string;
  title: string;
  explanation: string;
  suggestedAction: string;
  supportingMetrics: Record<string, number | string>;
  confidence: number;
  generatedAt: string;
  linkPath: string;
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

// Ask Agent
export interface AgentAnswer {
  query: string;
  directAnswer: string;
  explanation: string;
  recommendedAction: string;
  dataType: "table" | "cards" | "chart";
  data: Record<string, unknown>[] | TrendPoint[];
  columns?: string[];
}
