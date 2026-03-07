import type { CustomerMetrics, DateRange, Customer, AnalyticsData } from "@/types";
import { mockCustomers } from "@/lib/data/mock-customers";
import { invoices } from "@/lib/data/mock-invoices";
import { isDateInRange, getPriorPeriod } from "./date-range";

interface InvoiceWithTotal {
  id: string;
  customerId: string;
  invoiceDate: string;
  totalAmount: number;
}

export function computeCustomerMetrics(
  range: DateRange,
  data?: AnalyticsData | null
): CustomerMetrics[] {
  const customers = data?.customers ?? mockCustomers;
  const invList = data?.invoices ?? (invoices as InvoiceWithTotal[]);
  const priorRange = getPriorPeriod(range);
  const now = new Date();

  const orderCountByCustomer = new Map<string, number>();
  const revenueByCustomer = new Map<string, number>();
  const profitByCustomer = new Map<string, number>();
  const lastOrderByCustomer = new Map<string, string>();

  invList.forEach((inv) => {
    const last = lastOrderByCustomer.get(inv.customerId);
    if (!last || inv.invoiceDate > last) lastOrderByCustomer.set(inv.customerId, inv.invoiceDate);
    if (!isDateInRange(inv.invoiceDate, range)) return;
    const rev = inv.totalAmount;
    const profit = rev * 0.25;
    revenueByCustomer.set(
      inv.customerId,
      (revenueByCustomer.get(inv.customerId) ?? 0) + rev
    );
    profitByCustomer.set(
      inv.customerId,
      (profitByCustomer.get(inv.customerId) ?? 0) + profit
    );
    orderCountByCustomer.set(
      inv.customerId,
      (orderCountByCustomer.get(inv.customerId) ?? 0) + 1
    );
  });

  const priorRevenueByCustomer = new Map<string, number>();
  invList.forEach((inv) => {
    if (!isDateInRange(inv.invoiceDate, priorRange)) return;
    priorRevenueByCustomer.set(
      inv.customerId,
      (priorRevenueByCustomer.get(inv.customerId) ?? 0) + inv.totalAmount
    );
  });

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const result: CustomerMetrics[] = [];

  customers.forEach((customer) => {
    const revenue = revenueByCustomer.get(customer.id) ?? 0;
    const profit = profitByCustomer.get(customer.id) ?? 0;
    const orderCount = orderCountByCustomer.get(customer.id) ?? 0;
    const lastOrderDate = lastOrderByCustomer.get(customer.id) ?? null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor(
          (now.getTime() - new Date(lastOrderDate).getTime()) / (24 * 60 * 60 * 1000)
        )
      : null;
    const priorRevenue = priorRevenueByCustomer.get(customer.id) ?? 0;
    const trendVsPriorPct =
      priorRevenue > 0 ? ((revenue - priorRevenue) / priorRevenue) * 100 : null;
    const grossMarginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    let status: "active" | "at_risk" | "lost" | "new" = "active";
    const days = daysSinceLastOrder ?? 999;
    if (orderCount === 0) {
      status = days > 90 || lastOrderDate === null ? "lost" : "at_risk";
    } else if (days > 60) {
      status = "lost";
    } else if (days > 28) {
      status = "at_risk";
    } else if (trendVsPriorPct !== null && trendVsPriorPct < -30) {
      status = "at_risk";
    }
    // "new" could be first order in range - skip for simplicity

    result.push({
      customerId: customer.id,
      customerName: customer.name,
      revenue,
      grossProfit: profit,
      grossMarginPct,
      orderCount,
      averageOrderValue: aov,
      lastOrderDate,
      daysSinceLastOrder,
      trendVsPriorPct,
      status,
    });
  });

  return result.sort((a, b) => b.revenue - a.revenue);
}
