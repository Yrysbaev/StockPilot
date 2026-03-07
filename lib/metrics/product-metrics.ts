import type { ProductMetrics, DateRange, Product, AnalyticsData } from "@/types";
import { mockProducts } from "@/lib/data/mock-products";
import { invoiceItems, invoices } from "@/lib/data/mock-invoices";
import { isDateInRange, getPriorPeriod } from "./date-range";

export function computeProductMetrics(
  range: DateRange,
  data?: AnalyticsData | null
): ProductMetrics[] {
  const products = data?.products ?? mockProducts;
  const invList = data?.invoices ?? (invoices as { id: string; invoiceDate: string }[]);
  const itemList = data?.invoiceItems ?? invoiceItems;
  const invoiceDateMap = new Map(invList.map((inv) => [inv.id, inv.invoiceDate]));
  const getInvoiceDate = (invoiceId: string) => invoiceDateMap.get(invoiceId) ?? null;

  const priorRange = getPriorPeriod(range);
  const byProduct = new Map<
    string,
    { quantity: number; revenue: number; cost: number; lastSold: string | null }
  >();
  const priorByProduct = new Map<string, { quantity: number; revenue: number; cost: number }>();

  itemList.forEach((item) => {
    const invoiceDate = getInvoiceDate(item.invoiceId);
    if (!invoiceDate) return;

    const current = byProduct.get(item.productId) ?? {
      quantity: 0,
      revenue: 0,
      cost: 0,
      lastSold: null,
    };
    current.quantity += item.quantity;
    current.revenue += item.amount;
    current.cost += item.cost;
    if (!current.lastSold || invoiceDate > current.lastSold) current.lastSold = invoiceDate;
    byProduct.set(item.productId, current);

    if (isDateInRange(invoiceDate, priorRange)) {
      const prior = priorByProduct.get(item.productId) ?? {
        quantity: 0,
        revenue: 0,
        cost: 0,
      };
      prior.quantity += item.quantity;
      prior.revenue += item.amount;
      prior.cost += item.cost;
      priorByProduct.set(item.productId, prior);
    }
  });

  const rangeFiltered = new Map<
    string,
    { quantity: number; revenue: number; cost: number; lastSold: string | null }
  >();
  itemList.forEach((item) => {
    const invoiceDate = getInvoiceDate(item.invoiceId);
    if (!invoiceDate || !isDateInRange(invoiceDate, range)) return;
    const current = rangeFiltered.get(item.productId) ?? {
      quantity: 0,
      revenue: 0,
      cost: 0,
      lastSold: null,
    };
    current.quantity += item.quantity;
    current.revenue += item.amount;
    current.cost += item.cost;
    if (!current.lastSold || invoiceDate > current.lastSold) current.lastSold = invoiceDate;
    rangeFiltered.set(item.productId, current);
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const result: ProductMetrics[] = [];

  rangeFiltered.forEach((curr, productId) => {
    const product = productMap.get(productId);
    if (!product) return;
    const prior = priorByProduct.get(productId);
    const priorRevenue = prior?.revenue ?? 0;
    const trendVsPriorPct =
      priorRevenue > 0 ? ((curr.revenue - priorRevenue) / priorRevenue) * 100 : null;
    const avgSellingPrice = curr.quantity > 0 ? curr.revenue / curr.quantity : 0;
    const avgCost = curr.quantity > 0 ? curr.cost / curr.quantity : 0;
    const grossMarginPct =
      curr.revenue > 0 ? ((curr.revenue - curr.cost) / curr.revenue) * 100 : 0;
    result.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      category: product.category,
      brand: product.brand,
      unitsSold: curr.quantity,
      revenue: curr.revenue,
      cost: curr.cost,
      grossProfit: curr.revenue - curr.cost,
      grossMarginPct,
      avgSellingPrice,
      avgCost,
      lastSoldDate: curr.lastSold,
      trendVsPriorPct,
    });
  });

  return result.sort((a, b) => b.revenue - a.revenue);
}
