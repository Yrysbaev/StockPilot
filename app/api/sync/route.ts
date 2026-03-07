import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getValidAccessToken } from "@/lib/qb/token-store";
import { qbQuery } from "@/lib/qb/client";
import { QB_SANDBOX } from "@/lib/qb/config";
import {
  mapQBCustomerToApp,
  mapQBItemToApp,
  mapQBItemToInventorySnapshot,
  mapQBInvoiceToApp,
} from "@/lib/qb/map-qb-to-app";
import type { Product, Customer, Invoice, InvoiceItem, InventorySnapshot } from "@/types";
import { format } from "date-fns";

const DATA_DIR = path.join(process.cwd(), ".data");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * POST /api/sync — Pull data from QuickBooks and save to .data/*.json
 */
export async function POST() {
  try {
    const { accessToken, realmId } = await getValidAccessToken();
    const sandbox = QB_SANDBOX;

    const options = { realmId, accessToken, sandbox };

    const [qbCustomers, qbItems, qbInvoices] = await Promise.all([
      qbQuery<{ Id: string; DisplayName?: string; PrimaryEmailAddr?: { Address?: string }; Active?: boolean }>(
        options,
        "SELECT * FROM Customer"
      ),
      qbQuery<{ Id: string; Sku?: string; Name?: string; Type?: string; QtyOnHand?: number; UnitPrice?: number; PurchaseCost?: number }>(
        options,
        "SELECT * FROM Item WHERE Type IN ('Inventory', 'NonInventory', 'Service')"
      ),
      qbQuery<{
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
      }>(options, "SELECT * FROM Invoice"),
    ]);

    const customers: Customer[] = qbCustomers.map(mapQBCustomerToApp);
    const products: Product[] = qbItems.map((item, i) => mapQBItemToApp(item, i));
    const invoices: Invoice[] = [];
    const invoiceItems: InvoiceItem[] = [];
    qbInvoices.forEach((inv) => {
      const { invoice, items } = mapQBInvoiceToApp(inv);
      invoices.push(invoice);
      invoiceItems.push(...items);
    });

    const today = format(new Date(), "yyyy-MM-dd");
    const inventorySnapshots: InventorySnapshot[] = qbItems
      .filter((item) => (item.QtyOnHand ?? 0) > 0)
      .map((item) => mapQBItemToInventorySnapshot(item, today));

    await ensureDataDir();
    await Promise.all([
      fs.writeFile(path.join(DATA_DIR, "customers.json"), JSON.stringify(customers, null, 2)),
      fs.writeFile(path.join(DATA_DIR, "products.json"), JSON.stringify(products, null, 2)),
      fs.writeFile(path.join(DATA_DIR, "invoices.json"), JSON.stringify(invoices, null, 2)),
      fs.writeFile(path.join(DATA_DIR, "invoice_items.json"), JSON.stringify(invoiceItems, null, 2)),
      fs.writeFile(path.join(DATA_DIR, "inventory_snapshots.json"), JSON.stringify(inventorySnapshots, null, 2)),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        customers: customers.length,
        products: products.length,
        invoices: invoices.length,
        invoiceItems: invoiceItems.length,
        inventorySnapshots: inventorySnapshots.length,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
