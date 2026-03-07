import type { Alert, ProductMetrics, CustomerMetrics, InventoryMetrics, ARAgingRow } from "@/types";
import { format } from "date-fns";

export function generateAlerts(
  productMetrics: ProductMetrics[],
  customerMetrics: CustomerMetrics[],
  inventoryMetrics: InventoryMetrics[],
  arAging: ARAgingRow[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  inventoryMetrics.forEach((inv) => {
    if (inv.isDeadStock && inv.inventoryValue > 500) {
      alerts.push({
        id: `dead-${inv.productId}`,
        type: "inventory_risk",
        severity: inv.inventoryValue > 3000 ? "high" : "medium",
        entityType: "product",
        entityId: inv.productId,
        entityName: inv.productName,
        title: `${inv.sku} is tying up cash with no recent sales`,
        explanation: `This product has ${formatCurrency(inv.inventoryValue)} in inventory value and no meaningful sales in the last 60+ days (last sold: ${inv.lastSoldDate ?? "never"}).`,
        suggestedAction: "Reduce next purchase cycle or create promotion to clear stock.",
        supportingMetrics: {
          "Inventory value": inv.inventoryValue,
          "Days since last sale": inv.daysSinceLastSale ?? "N/A",
        },
        confidence: 0.95,
        generatedAt: now,
        linkPath: `/products/${inv.productId}`,
      });
    }
    if (inv.overstockRisk === "high" && inv.inventoryValue > 2000) {
      alerts.push({
        id: `over-${inv.productId}`,
        type: "inventory_risk",
        severity: "medium",
        entityType: "product",
        entityId: inv.productId,
        entityName: inv.productName,
        title: `${inv.sku} may be overstocked`,
        explanation: `Weeks of supply is ${inv.weeksOfSupply ?? "N/A"} with inventory value ${formatCurrency(inv.inventoryValue)}.`,
        suggestedAction: "Review reorder quantity and consider pausing next order.",
        supportingMetrics: {
          "Weeks of supply": inv.weeksOfSupply ?? 0,
          "Inventory value": inv.inventoryValue,
        },
        confidence: 0.8,
        generatedAt: now,
        linkPath: `/products/${inv.productId}`,
      });
    }
    if (inv.reorderStatus === "critical" || inv.reorderStatus === "reorder") {
      alerts.push({
        id: `reorder-${inv.productId}`,
        type: "sales_opportunity",
        severity: inv.reorderStatus === "critical" ? "high" : "medium",
        entityType: "product",
        entityId: inv.productId,
        entityName: inv.productName,
        title: `${inv.sku} may need reorder soon`,
        explanation: `Current stock: ${inv.quantityOnHand} units. Sales velocity suggests ${inv.weeksOfSupply ?? 0} weeks of supply.`,
        suggestedAction: "Place reorder to avoid stock-out.",
        supportingMetrics: {
          "Quantity on hand": inv.quantityOnHand,
          "Weeks of supply": inv.weeksOfSupply ?? 0,
        },
        confidence: 0.85,
        generatedAt: now,
        linkPath: `/products/${inv.productId}`,
      });
    }
  });

  customerMetrics.forEach((c) => {
    if (c.status === "at_risk" && (c.daysSinceLastOrder ?? 0) > 20) {
      alerts.push({
        id: `atrisk-${c.customerId}`,
        type: "customer_retention",
        severity: "medium",
        entityType: "customer",
        entityId: c.customerId,
        entityName: c.customerName,
        title: `${c.customerName} may be at risk`,
        explanation: `Last order was ${c.daysSinceLastOrder} days ago. Previous order frequency was higher.`,
        suggestedAction: "Sales team should follow up this week.",
        supportingMetrics: {
          "Days since last order": c.daysSinceLastOrder ?? 0,
          "Revenue (period)": c.revenue,
        },
        confidence: 0.85,
        generatedAt: now,
        linkPath: `/customers/${c.customerId}`,
      });
    }
    if (c.status === "lost") {
      alerts.push({
        id: `lost-${c.customerId}`,
        type: "customer_retention",
        severity: "high",
        entityType: "customer",
        entityId: c.customerId,
        entityName: c.customerName,
        title: `${c.customerName} has stopped ordering`,
        explanation: `No orders in 90+ days (last: ${c.lastOrderDate ?? "N/A"}).`,
        suggestedAction: "Reactivation campaign or personal outreach.",
        supportingMetrics: {
          "Days since last order": c.daysSinceLastOrder ?? 0,
        },
        confidence: 0.9,
        generatedAt: now,
        linkPath: `/customers/${c.customerId}`,
      });
    }
    if (c.revenue > 5000 && c.grossMarginPct < 15) {
      alerts.push({
        id: `lowmargin-${c.customerId}`,
        type: "profitability",
        severity: "low",
        entityType: "customer",
        entityId: c.customerId,
        entityName: c.customerName,
        title: `${c.customerName} has strong revenue but low margin`,
        explanation: `Revenue is ${formatCurrency(c.revenue)} with gross margin ${c.grossMarginPct.toFixed(1)}%.`,
        suggestedAction: "Review product mix or pricing for this customer.",
        supportingMetrics: {
          Revenue: c.revenue,
          "Gross margin %": c.grossMarginPct,
        },
        confidence: 0.9,
        generatedAt: now,
        linkPath: `/customers/${c.customerId}`,
      });
    }
  });

  arAging.forEach((ar) => {
    const overdue = ar.overdue1to30 + ar.overdue31to60 + ar.overdue61to90 + ar.overdue90Plus;
    if (overdue > 5000 || ar.overdue90Plus > 0) {
      alerts.push({
        id: `ar-${ar.customerId}`,
        type: "cash_flow",
        severity: ar.overdue90Plus > 0 ? "high" : "medium",
        entityType: "customer",
        entityId: ar.customerId,
        entityName: ar.customerName,
        title: `${ar.customerName} has overdue balance`,
        explanation: `Open balance ${formatCurrency(ar.openBalance)}; overdue amount ${formatCurrency(overdue)}.`,
        suggestedAction: "Collections follow-up and payment plan if needed.",
        supportingMetrics: {
          "Open balance": ar.openBalance,
          "Overdue": overdue,
        },
        confidence: 0.95,
        generatedAt: now,
        linkPath: `/customers/${ar.customerId}`,
      });
    }
  });

  productMetrics.forEach((p) => {
    if (p.trendVsPriorPct !== null && p.trendVsPriorPct < -25 && p.revenue > 1000) {
      alerts.push({
        id: `decline-${p.productId}`,
        type: "profitability",
        severity: "medium",
        entityType: "product",
        entityId: p.productId,
        entityName: p.productName,
        title: `${p.sku} revenue declining vs prior period`,
        explanation: `Revenue is down ${Math.abs(p.trendVsPriorPct).toFixed(0)}% vs previous period.`,
        suggestedAction: "Review pricing, promotion, or demand.",
        supportingMetrics: {
          "Trend vs prior %": p.trendVsPriorPct,
          Revenue: p.revenue,
        },
        confidence: 0.8,
        generatedAt: now,
        linkPath: `/products/${p.productId}`,
      });
    }
  });

  return alerts.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function severityOrder(s: Alert["severity"]): number {
  switch (s) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

export const ALERT_CATEGORY_LABELS: Record<Alert["type"], string> = {
  inventory_risk: "Inventory risk",
  sales_opportunity: "Sales opportunities",
  customer_retention: "Customer retention",
  cash_flow: "Cash flow / AR",
  profitability: "Profitability",
};
