"use client";

import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { Badge } from "@/components/ui/badge";
import { computeInventoryMetrics } from "@/lib/metrics";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { InventoryMetrics } from "@/types";

export default function InventoryDashboardPage() {
  const { data, isLoading } = useData();
  const inventoryMetrics = computeInventoryMetrics(data);
  const slowMoving = inventoryMetrics.filter((i) => i.isSlowMoving);
  const deadStock = inventoryMetrics.filter((i) => i.isDeadStock);
  const lowStock = inventoryMetrics.filter((i) => i.reorderStatus === "reorder" || i.reorderStatus === "critical");
  const reorderSuggestions = inventoryMetrics.filter((i) => i.reorderStatus === "reorder" || i.reorderStatus === "critical");
  const overstock = inventoryMetrics.filter((i) => i.overstockRisk === "high" || i.overstockRisk === "medium");

  const columns: Column<InventoryMetrics>[] = [
    { key: "sku", header: "SKU" },
    { key: "productName", header: "Product" },
    { key: "category", header: "Category" },
    { key: "quantityOnHand", header: "Qty on hand", render: (r) => formatNumber(r.quantityOnHand) },
    { key: "inventoryValue", header: "Inventory value", render: (r) => formatCurrency(r.inventoryValue) },
    { key: "inventoryValueSharePct", header: "Value share %", render: (r) => `${r.inventoryValueSharePct.toFixed(1)}%` },
    { key: "avgWeeklyUnitsSold", header: "Avg weekly sold", render: (r) => formatNumber(r.avgWeeklyUnitsSold, 1) },
    { key: "daysSinceLastSale", header: "Days since last sale", render: (r) => r.daysSinceLastSale ?? "—" },
    { key: "lastSoldDate", header: "Last sold", render: (r) => r.lastSoldDate ?? "—" },
    { key: "weeksOfSupply", header: "Weeks of supply", render: (r) => r.weeksOfSupply ?? "—" },
    {
      key: "reorderStatus",
      header: "Reorder",
      render: (r) => (
        <Badge variant={r.reorderStatus === "critical" ? "destructive" : r.reorderStatus === "reorder" ? "warning" : "secondary"}>
          {r.reorderStatus}
        </Badge>
      ),
    },
    {
      key: "overstockRisk",
      header: "Overstock risk",
      render: (r) => (r.overstockRisk !== "none" ? <Badge variant="outline">{r.overstockRisk}</Badge> : "—"),
    },
  ];

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Inventory Dashboard" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Inventory Dashboard" />
      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Inventory value by SKU</h2>
          <Card>
            <CardContent className="pt-6">
              <DataTable data={inventoryMetrics} columns={columns} keyField="productId" />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Slow-moving inventory</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products with low sales velocity vs stock</CardTitle>
            </CardHeader>
            <CardContent>
              {slowMoving.length > 0 ? (
                <DataTable data={slowMoving} columns={columns} keyField="productId" />
              ) : (
                <p className="text-muted-foreground py-4">No slow-moving items in this period.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Dead stock</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock on hand but no sales in 60+ days</CardTitle>
            </CardHeader>
            <CardContent>
              {deadStock.length > 0 ? (
                <DataTable data={deadStock} columns={columns} keyField="productId" />
              ) : (
                <p className="text-muted-foreground py-4">No dead stock.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Low-stock & reorder suggestions</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products that may need reorder</CardTitle>
            </CardHeader>
            <CardContent>
              {reorderSuggestions.length > 0 ? (
                <DataTable data={reorderSuggestions} columns={columns} keyField="productId" />
              ) : (
                <p className="text-muted-foreground py-4">No reorder suggestions at this time.</p>
              )}
            </CardContent>
          </Card>
        </section>

        {overstock.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Overstock risk</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Products with high weeks of supply</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable data={overstock} columns={columns} keyField="productId" />
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
