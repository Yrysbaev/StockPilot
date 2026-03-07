import type { AgentAnswer, ProductMetrics, CustomerMetrics, InventoryMetrics, ARAgingRow, Alert } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type DataContext = {
  productMetrics: ProductMetrics[];
  customerMetrics: CustomerMetrics[];
  inventoryMetrics: InventoryMetrics[];
  arAging: ARAgingRow[];
  alerts: Alert[];
};

const QUERY_PATTERNS: Array<{
  pattern: RegExp | ((q: string) => boolean);
  handler: (ctx: DataContext, query: string) => Partial<AgentAnswer>;
}> = [
  {
    pattern: /top\s+products?\s+(last\s+month|past\s+month|this\s+month|last\s+\d+\s+days?|recent)/i,
    handler: (ctx) => ({
      directAnswer: `Top products by revenue: ${ctx.productMetrics.slice(0, 5).map((p) => p.productName).join(", ")}.`,
      explanation: "Based on revenue in the selected period.",
      recommendedAction: "Focus restocking and promotion on these SKUs.",
      dataType: "table",
      columns: ["SKU", "Product", "Revenue", "Units sold", "Gross margin %"],
      data: ctx.productMetrics.slice(0, 10).map((p) => ({
        SKU: p.sku,
        Product: p.productName,
        Revenue: formatCurrency(p.revenue),
        "Units sold": p.unitsSold,
        "Gross margin %": formatPercent(p.grossMarginPct),
      })),
    }),
  },
  {
    pattern: /which\s+products?\s+(are\s+not\s+sell|not\s+sell|have\s+no\s+sales|no\s+recent\s+sales)/i,
    handler: (ctx) => {
      const noSales = ctx.inventoryMetrics.filter((i) => i.daysSinceLastSale !== null && i.daysSinceLastSale > 30 && i.quantityOnHand > 0);
      return {
        directAnswer: noSales.length > 0
          ? `${noSales.length} product(s) have stock but no recent sales (e.g. ${noSales[0].productName}).`
          : "All products with stock have had recent sales.",
        explanation: "Products with quantity on hand and no sales in the last 30+ days.",
        recommendedAction: noSales.length > 0 ? "Review for promotion or write-down." : "No action needed.",
        dataType: "table",
        columns: ["SKU", "Product", "Qty on hand", "Days since last sale", "Inventory value"],
        data: noSales.slice(0, 15).map((p) => ({
          SKU: p.sku,
          Product: p.productName,
          "Qty on hand": p.quantityOnHand,
          "Days since last sale": p.daysSinceLastSale ?? "N/A",
          "Inventory value": formatCurrency(p.inventoryValue),
        })),
      };
    },
  },
  {
    pattern: /which\s+customers?\s+(stopped\s+buying|have\s+stopped|not\s+ordering)/i,
    handler: (ctx) => {
      const lost = ctx.customerMetrics.filter((c) => c.status === "lost");
      return {
        directAnswer: lost.length > 0
          ? `${lost.length} customer(s) have stopped ordering: ${lost.slice(0, 3).map((c) => c.customerName).join(", ")}.`
          : "No customers currently classified as lost.",
        explanation: "Customers with no orders in 90+ days.",
        recommendedAction: lost.length > 0 ? "Run reactivation campaign or personal outreach." : "No action needed.",
        dataType: "table",
        columns: ["Customer", "Last order", "Days since order"],
        data: lost.slice(0, 10).map((c) => ({
          Customer: c.customerName,
          "Last order": c.lastOrderDate ?? "N/A",
          "Days since order": c.daysSinceLastOrder ?? "N/A",
        })),
      };
    },
  },
  {
    pattern: /which\s+customers?\s+(made\s+us\s+most\s+profit|most\s+profit|highest\s+profit)/i,
    handler: (ctx) => ({
      directAnswer: `Top by profit: ${ctx.customerMetrics.slice(0, 3).map((c) => c.customerName).join(", ")}.`,
      explanation: "Ranked by gross profit in the selected period.",
      recommendedAction: "Protect relationships and ensure satisfaction.",
      dataType: "table",
      columns: ["Customer", "Revenue", "Gross profit", "Margin %"],
      data: ctx.customerMetrics.slice(0, 10).map((c) => ({
        Customer: c.customerName,
        Revenue: formatCurrency(c.revenue),
        "Gross profit": formatCurrency(c.grossProfit),
        "Margin %": formatPercent(c.grossMarginPct),
      })),
    }),
  },
  {
    pattern: /which\s+skus?\s+hold\s+(the\s+most\s+)?money\s+in\s+stock|most\s+inventory\s+value|inventory\s+value/i,
    handler: (ctx) => ({
      directAnswer: `Highest inventory value: ${ctx.inventoryMetrics.slice(0, 3).map((p) => `${p.sku} (${formatCurrency(p.inventoryValue)})`).join("; ")}.`,
      explanation: "Products ranked by current inventory asset value.",
      recommendedAction: "Monitor slow movers in this list for overstock risk.",
      dataType: "table",
      columns: ["SKU", "Product", "Inventory value", "Qty on hand", "Weeks of supply"],
      data: ctx.inventoryMetrics.slice(0, 10).map((p) => ({
        SKU: p.sku,
        Product: p.productName,
        "Inventory value": formatCurrency(p.inventoryValue),
        "Qty on hand": p.quantityOnHand,
        "Weeks of supply": p.weeksOfSupply ?? "N/A",
      })),
    }),
  },
  {
    pattern: /biggest\s+problems?|what\s+(are\s+)?the\s+problems?|issues?\s+this\s+week/i,
    handler: (ctx) => {
      const high = ctx.alerts.filter((a) => a.severity === "high" || a.severity === "critical");
      return {
        directAnswer: high.length > 0
          ? `There are ${high.length} high-priority alerts: ${high.slice(0, 3).map((a) => a.title).join("; ")}.`
          : "No critical or high-severity alerts right now.",
        explanation: "Prioritized issues requiring attention.",
        recommendedAction: "Review the Alerts page and take suggested actions.",
        dataType: "cards",
        data: high.slice(0, 8).map((a) => ({
          title: a.title,
          severity: a.severity,
          action: a.suggestedAction,
        })),
      };
    },
  },
  {
    pattern: /reorder\s+now|what\s+to\s+reorder|need\s+reorder/i,
    handler: (ctx) => {
      const reorder = ctx.inventoryMetrics.filter(
        (p) => (p.reorderStatus === "reorder" || p.reorderStatus === "critical") && p.quantityOnHand >= 0
      );
      return {
        directAnswer: reorder.length > 0
          ? `${reorder.length} product(s) likely need reorder: ${reorder.slice(0, 3).map((p) => p.sku).join(", ")}.`
          : "No products currently flagged for reorder.",
        explanation: "Based on weeks of supply and sales velocity.",
        recommendedAction: reorder.length > 0 ? "Place purchase orders for these SKUs." : "No action needed.",
        dataType: "table",
        columns: ["SKU", "Product", "Qty on hand", "Weeks of supply"],
        data: reorder.slice(0, 10).map((p) => ({
          SKU: p.sku,
          Product: p.productName,
          "Qty on hand": p.quantityOnHand,
          "Weeks of supply": p.weeksOfSupply ?? "N/A",
        })),
      };
    },
  },
  {
    pattern: /which\s+customers?\s+should\s+we\s+contact|contact\s+this\s+week|customers?\s+to\s+call/i,
    handler: (ctx) => {
      const contact = ctx.alerts.filter(
        (a) => a.entityType === "customer" && (a.type === "customer_retention" || a.type === "cash_flow")
      );
      return {
        directAnswer: contact.length > 0
          ? `Recommend contacting ${contact.length} customer(s): ${contact.slice(0, 3).map((a) => a.entityName).join(", ")}.`
          : "No specific contact list from alerts; check at-risk customers on Customer dashboard.",
        explanation: "Customers with at-risk or overdue alerts.",
        recommendedAction: "Sales and collections should follow up this week.",
        dataType: "table",
        columns: ["Customer", "Alert", "Suggested action"],
        data: contact.slice(0, 10).map((a) => ({
          Customer: a.entityName,
          Alert: a.title,
          "Suggested action": a.suggestedAction,
        })),
      };
    },
  },
  {
    pattern: (q) => q.length > 3,
    handler: (ctx) => ({
      directAnswer: "Here’s a snapshot of key metrics for the selected period.",
      explanation: "Use the dashboards for detailed analysis, or try questions like: 'Top products last month', 'Which customers stopped buying?', 'What to reorder now?'",
      recommendedAction: "Use the date filter and visit Sales, Inventory, Customer, or Alerts pages for more.",
      dataType: "table",
      columns: ["Metric", "Value"],
      data: [
        { Metric: "Total product revenue (top 10)", Value: formatCurrency(ctx.productMetrics.slice(0, 10).reduce((s, p) => s + p.revenue, 0)) },
        { Metric: "Customers with orders", Value: ctx.customerMetrics.filter((c) => c.orderCount > 0).length },
        { Metric: "Active alerts", Value: ctx.alerts.length },
      ],
    }),
  },
];

export function askAgent(query: string, ctx: DataContext): AgentAnswer {
  const normalized = query.trim().toLowerCase();
  for (const { pattern, handler } of QUERY_PATTERNS) {
    const match = typeof pattern === "function" ? pattern(normalized) : pattern.test(query);
    if (match) {
      const part = handler(ctx, query);
      return {
        query,
        directAnswer: part.directAnswer ?? "No direct answer.",
        explanation: part.explanation ?? "",
        recommendedAction: part.recommendedAction ?? "",
        dataType: part.dataType ?? "table",
        data: part.data ?? [],
        columns: part.columns,
      };
    }
  }
  return {
    query,
    directAnswer: "I didn’t find a specific answer for that. Try: 'Top products last month', 'Which customers stopped buying?', or 'What should we reorder?'",
    explanation: "The agent uses predefined rules; more questions will be added over time.",
    recommendedAction: "Use the Alerts page for prioritized actions.",
    dataType: "table",
    data: [],
    columns: [],
  };
}
