import type { InventoryMetrics, Product, AnalyticsData } from "@/types";
import { mockProducts } from "@/lib/data/mock-products";
import { inventorySnapshots } from "@/lib/data/mock-inventory";
import { invoiceItems, invoices } from "@/lib/data/mock-invoices";
import { differenceInDays, format } from "date-fns";

export function computeInventoryMetrics(data?: AnalyticsData | null): InventoryMetrics[] {
  const products = data?.products ?? mockProducts;
  const invList = data?.invoices ?? (invoices as { id: string; invoiceDate: string }[]);
  const itemList = data?.invoiceItems ?? invoiceItems;
  const snaps = data?.inventorySnapshots ?? inventorySnapshots;
  const invoiceDateMap = new Map(invList.map((inv) => [inv.id, inv.invoiceDate]));
  const getInvoiceDate = (invoiceId: string) => invoiceDateMap.get(invoiceId) ?? null;

  const today = format(new Date(), "yyyy-MM-dd");
  const snapshotByProduct = new Map(snaps.map((s) => [s.productId, s]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  const salesByProduct = new Map<string, { qty: number; lastSold: string | null }>();
  itemList.forEach((item) => {
    const invDate = getInvoiceDate(item.invoiceId);
    if (!invDate) return;
    const curr = salesByProduct.get(item.productId) ?? { qty: 0, lastSold: null };
    curr.qty += item.quantity;
    if (!curr.lastSold || invDate > curr.lastSold) curr.lastSold = invDate;
    salesByProduct.set(item.productId, curr);
  });

  const totalValue = snaps.reduce((s, snap) => s + snap.assetValue, 0);

  const result: InventoryMetrics[] = products.map((product) => {
    const snap = snapshotByProduct.get(product.id);
    const qty = snap?.quantityOnHand ?? 0;
    const value = snap?.assetValue ?? 0;
    const valueShare = totalValue > 0 ? (value / totalValue) * 100 : 0;
    const sales = salesByProduct.get(product.id);
    const totalSold = sales?.qty ?? 0;
    const lastSold = sales?.lastSold ?? null;
    const daysSinceLastSale = lastSold
      ? differenceInDays(new Date(), new Date(lastSold))
      : null;
    const daysInPeriod = 90;
    const avgMonthlySold = daysInPeriod >= 30 ? (totalSold / daysInPeriod) * 30 : totalSold;
    const avgWeeklySold = daysInPeriod >= 7 ? (totalSold / daysInPeriod) * 7 : totalSold;
    const weeksOfSupply =
      avgWeeklySold > 0 && qty > 0 ? qty / avgWeeklySold : null;

    let reorderStatus: "ok" | "low" | "reorder" | "critical" = "ok";
    if (qty === 0 && avgWeeklySold > 0) reorderStatus = "critical";
    else if (weeksOfSupply !== null) {
      if (weeksOfSupply < 1) reorderStatus = "critical";
      else if (weeksOfSupply < 2) reorderStatus = "reorder";
      else if (weeksOfSupply < 4) reorderStatus = "low";
    }

    let overstockRisk: "none" | "low" | "medium" | "high" = "none";
    if (weeksOfSupply !== null && qty > 0) {
      if (weeksOfSupply > 26) overstockRisk = "high";
      else if (weeksOfSupply > 12) overstockRisk = "medium";
      else if (weeksOfSupply > 8) overstockRisk = "low";
    }
    const isDeadStock = qty > 0 && (daysSinceLastSale === null || daysSinceLastSale > 60);
    const isSlowMoving =
      qty > 0 &&
      weeksOfSupply !== null &&
      weeksOfSupply > 12 &&
      (daysSinceLastSale === null || daysSinceLastSale > 30);

    return {
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      category: product.category,
      quantityOnHand: qty,
      inventoryValue: value,
      inventoryValueSharePct: valueShare,
      avgMonthlyUnitsSold: avgMonthlySold,
      avgWeeklyUnitsSold: avgWeeklySold,
      daysSinceLastSale,
      lastSoldDate: lastSold,
      weeksOfSupply: weeksOfSupply !== null ? Math.round(weeksOfSupply * 10) / 10 : null,
      reorderStatus,
      overstockRisk,
      isDeadStock,
      isSlowMoving,
    };
  });

  return result.sort((a, b) => b.inventoryValue - a.inventoryValue);
}
