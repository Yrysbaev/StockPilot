import type { ARAgingRow, Customer, AnalyticsData } from "@/types";
import { mockCustomers } from "@/lib/data/mock-customers";
import { invoices } from "@/lib/data/mock-invoices";
import { differenceInDays, parseISO } from "date-fns";

interface InvRow {
  id: string;
  customerId: string;
  balanceDue: number;
  dueDate: string;
  invoiceDate: string;
}

export function computeARAging(data?: AnalyticsData | null): ARAgingRow[] {
  const customers = data?.customers ?? mockCustomers;
  const invList = data?.invoices ?? (invoices as InvRow[]);
  const today = new Date();
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const byCustomer = new Map<
    string,
    {
      openBalance: number;
      current: number;
      overdue1to30: number;
      overdue31to60: number;
      overdue61to90: number;
      overdue90Plus: number;
      openInvoiceCount: number;
      lastPaymentDate: string | null;
    }
  >();

  invList.forEach((inv) => {
    if (inv.balanceDue <= 0) return;
    const due = parseISO(inv.dueDate);
    const daysOverdue = differenceInDays(today, due);
    let current = 0,
      o1 = 0,
      o2 = 0,
      o3 = 0,
      o4 = 0;
    if (daysOverdue <= 0) current = inv.balanceDue;
    else if (daysOverdue <= 30) o1 = inv.balanceDue;
    else if (daysOverdue <= 60) o2 = inv.balanceDue;
    else if (daysOverdue <= 90) o3 = inv.balanceDue;
    else o4 = inv.balanceDue;

    const curr = byCustomer.get(inv.customerId) ?? {
      openBalance: 0,
      current: 0,
      overdue1to30: 0,
      overdue31to60: 0,
      overdue61to90: 0,
      overdue90Plus: 0,
      openInvoiceCount: 0,
      lastPaymentDate: null,
    };
    curr.openBalance += inv.balanceDue;
    curr.current += current;
    curr.overdue1to30 += o1;
    curr.overdue31to60 += o2;
    curr.overdue61to90 += o3;
    curr.overdue90Plus += o4;
    curr.openInvoiceCount += 1;
    byCustomer.set(inv.customerId, curr);
  });

  const result: ARAgingRow[] = [];
  byCustomer.forEach((row, customerId) => {
    const customer = customerMap.get(customerId);
    if (!customer) return;
    const overdueTotal =
      row.overdue1to30 + row.overdue31to60 + row.overdue61to90 + row.overdue90Plus;
    let riskFlag: "low" | "medium" | "high" = "low";
    if (row.overdue90Plus > 0 || overdueTotal > 10000) riskFlag = "high";
    else if (row.overdue31to60 + row.overdue61to90 > 0 || overdueTotal > 3000)
      riskFlag = "medium";
    result.push({
      customerId,
      customerName: customer.name,
      openBalance: row.openBalance,
      current: row.current,
      overdue1to30: row.overdue1to30,
      overdue31to60: row.overdue31to60,
      overdue61to90: row.overdue61to90,
      overdue90Plus: row.overdue90Plus,
      openInvoiceCount: row.openInvoiceCount,
      lastPaymentDate: row.lastPaymentDate,
      riskFlag,
    });
  });
  return result.sort((a, b) => b.openBalance - a.openBalance);
}
