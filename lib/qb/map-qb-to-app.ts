/**
 * Map QuickBooks API response shapes to our app types.
 * QB uses string Ids; we use "qb-" + Id for internal id and keep externalId = Id.
 */

import type { Product, Customer, Invoice, InvoiceItem, InventorySnapshot } from "@/types";

function id(qbId: string): string {
  return `qb-${qbId}`;
}

// QB Customer: { Id, DisplayName, PrimaryEmailAddr?, Active }
export function mapQBCustomerToApp(c: { Id: string; DisplayName?: string; PrimaryEmailAddr?: { Address?: string }; Active?: boolean }): Customer {
  return {
    id: id(c.Id),
    externalId: c.Id,
    name: c.DisplayName ?? `Customer ${c.Id}`,
    email: c.PrimaryEmailAddr?.Address ?? null,
    isActive: c.Active !== false,
  };
}

// QB Item: { Id, Sku, Name, Type, QtyOnHand, UnitPrice, PurchaseCost? }
export function mapQBItemToApp(
  item: {
    Id: string;
    Sku?: string;
    Name?: string;
    Type?: string;
    QtyOnHand?: number;
    UnitPrice?: number;
    PurchaseCost?: number;
  },
  index: number
): Product {
  return {
    id: id(item.Id),
    externalId: item.Id,
    sku: item.Sku ?? item.Id,
    name: item.Name ?? `Item ${item.Id}`,
    category: "",
    brand: "",
    unit: "Each",
    isActive: true,
  };
}

export function mapQBItemToInventorySnapshot(
  item: {
    Id: string;
    QtyOnHand?: number;
    UnitPrice?: number;
    PurchaseCost?: number;
  },
  snapshotDate: string
): InventorySnapshot {
  const qty = item.QtyOnHand ?? 0;
  const cost = item.PurchaseCost ?? item.UnitPrice ?? 0;
  const assetValue = qty * cost;
  return {
    id: `qb-snap-${item.Id}-${snapshotDate}`,
    productId: id(item.Id),
    snapshotDate,
    quantityOnHand: qty,
    assetValue,
  };
}

// QB Invoice: { Id, CustomerRef, DocNumber, TxnDate, DueDate, TotalAmt, Balance, Line[] }
export function mapQBInvoiceToApp(
  inv: {
    Id: string;
    CustomerRef?: { value?: string };
    DocNumber?: string;
    TxnDate?: string;
    DueDate?: string;
    TotalAmt?: number;
    Balance?: number;
    Line?: Array<{
      Id?: string;
      SalesItemLineDetail?: { ItemRef?: { value?: string }; Qty?: number; UnitPrice?: number };
      Amount?: number;
    }>;
  }
): { invoice: Invoice; items: InvoiceItem[] } {
  const customerId = inv.CustomerRef?.value ? id(inv.CustomerRef.value) : "";
  const invoice: Invoice = {
    id: id(inv.Id),
    externalId: inv.Id,
    customerId,
    invoiceNumber: inv.DocNumber ?? inv.Id,
    invoiceDate: inv.TxnDate ?? "",
    dueDate: inv.DueDate ?? inv.TxnDate ?? "",
    totalAmount: inv.TotalAmt ?? 0,
    balanceDue: inv.Balance ?? 0,
    status: (inv.Balance ?? 0) > 0 ? "Open" : "Paid",
  };

  const items: InvoiceItem[] = [];
  (inv.Line ?? []).forEach((line, idx) => {
    const detail = line.SalesItemLineDetail;
    if (!detail?.ItemRef?.value) return;
    const productId = id(detail.ItemRef.value);
    const qty = detail.Qty ?? 0;
    const unitPrice = detail.UnitPrice ?? 0;
    const amount = line.Amount ?? qty * unitPrice;
    const costPerUnit = unitPrice * 0.7; // estimate cost when not provided
    items.push({
      id: `qb-li-${inv.Id}-${idx}`,
      invoiceId: invoice.id,
      productId,
      quantity: qty,
      unitPrice,
      amount,
      cost: qty * costPerUnit,
    });
  });

  return { invoice, items };
}
