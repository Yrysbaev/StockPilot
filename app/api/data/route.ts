import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Product, Customer, Invoice, InvoiceItem, InventorySnapshot } from "@/types";
import { mockProducts } from "@/lib/data/mock-products";
import { mockCustomers } from "@/lib/data/mock-customers";
import { invoices, invoiceItems } from "@/lib/data/mock-invoices";
import { inventorySnapshots } from "@/lib/data/mock-inventory";

const DATA_DIR = path.join(process.cwd(), ".data");

export interface AnalyticsDataResponse {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  inventorySnapshots: InventorySnapshot[];
  source: "quickbooks" | "mock";
}

/**
 * GET /api/data — Returns products, customers, invoices, invoice_items, inventory_snapshots.
 * If .data/*.json exist (after QuickBooks sync), returns that; otherwise returns mock data.
 */
export async function GET() {
  try {
    const customersPath = path.join(DATA_DIR, "customers.json");
    const productsPath = path.join(DATA_DIR, "products.json");
    const invoicesPath = path.join(DATA_DIR, "invoices.json");
    const invoiceItemsPath = path.join(DATA_DIR, "invoice_items.json");
    const inventoryPath = path.join(DATA_DIR, "inventory_snapshots.json");

    let source: "quickbooks" | "mock" = "mock";
    let products: Product[] = mockProducts;
    let customers: Customer[] = mockCustomers;
    let invoicesData: Invoice[] = invoices as Invoice[];
    let invoiceItemsData: InvoiceItem[] = invoiceItems as InvoiceItem[];
    let inventorySnapshotsData: InventorySnapshot[] = inventorySnapshots;

    try {
      const [customersRaw, productsRaw, invoicesRaw, invoiceItemsRaw, inventoryRaw] = await Promise.all([
        fs.readFile(customersPath, "utf-8").catch(() => null),
        fs.readFile(productsPath, "utf-8").catch(() => null),
        fs.readFile(invoicesPath, "utf-8").catch(() => null),
        fs.readFile(invoiceItemsPath, "utf-8").catch(() => null),
        fs.readFile(inventoryPath, "utf-8").catch(() => null),
      ]);

      if (customersRaw && productsRaw && invoicesRaw && invoiceItemsRaw) {
        customers = JSON.parse(customersRaw) as Customer[];
        products = JSON.parse(productsRaw) as Product[];
        invoicesData = JSON.parse(invoicesRaw) as Invoice[];
        invoiceItemsData = JSON.parse(invoiceItemsRaw) as InvoiceItem[];
        if (inventoryRaw) {
          inventorySnapshotsData = JSON.parse(inventoryRaw) as InventorySnapshot[];
        }
        source = "quickbooks";
      }
    } catch {
      // use mock
    }

    return NextResponse.json({
      products,
      customers,
      invoices: invoicesData,
      invoiceItems: invoiceItemsData,
      inventorySnapshots: inventorySnapshotsData,
      source,
    } as AnalyticsDataResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
