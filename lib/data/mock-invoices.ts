import type { Invoice, InvoiceItem } from "@/types";
import { subDays, subMonths, format } from "date-fns";

const productIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
const customerIds = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const invoices: Invoice[] = [];
const invoiceItems: InvoiceItem[] = [];
let invId = 1;
let itemId = 1;

// Generate ~60 days of invoices across customers
for (let d = 0; d < 60; d++) {
  const date = subDays(new Date(), d);
  const numInvoices = randomInt(2, 6);
  for (let i = 0; i < numInvoices; i++) {
    const customerId = randomChoice(customerIds);
    const totalAmount = randomInt(200, 3500);
    const balanceDue = Math.random() > 0.3 ? randomInt(0, totalAmount) : 0;
    const inv: Invoice = {
      id: `inv-${invId}`,
      externalId: `QB-INV-${invId}`,
      customerId,
      invoiceNumber: `INV-${1000 + invId}`,
      invoiceDate: format(date, "yyyy-MM-dd"),
      dueDate: format(subDays(date, -30), "yyyy-MM-dd"),
      totalAmount,
      balanceDue,
      status: balanceDue > 0 ? "Open" : "Paid",
    };
    invoices.push(inv);

    const numLines = randomInt(1, 5);
    let remaining = totalAmount;
    for (let L = 0; L < numLines; L++) {
      const productId = randomChoice(productIds);
      const qty = randomInt(2, 40);
      const unitPrice = randomInt(3, 45);
      const amount = qty * unitPrice;
      const costPerUnit = unitPrice * (0.5 + Math.random() * 0.4);
      const cost = qty * costPerUnit;
      remaining -= amount;
      invoiceItems.push({
        id: `ii-${itemId}`,
        invoiceId: inv.id,
        productId,
        quantity: qty,
        unitPrice,
        amount,
        cost,
      });
      itemId++;
    }
    invId++;
  }
}

export { invoices, invoiceItems };
