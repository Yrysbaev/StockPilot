"use client";

import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { KpiCard } from "@/components/analytics/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { InsightCard } from "@/components/analytics/InsightCard";
import {
  computeProductMetrics,
  computeCustomerMetrics,
  computeInventoryMetrics,
  computeARAging,
} from "@/lib/metrics";
import { generateAlerts } from "@/lib/insights";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductMetrics, CustomerMetrics, Alert } from "@/types";

export default function ExecutiveOverviewPage() {
  const { range } = useDateRange();
  const { data, isLoading, error, source } = useData();
  const productMetrics = computeProductMetrics(range, data);
  const customerMetrics = computeCustomerMetrics(range, data);
  const inventoryMetrics = computeInventoryMetrics(data);
  const arAging = computeARAging(data);
  const alerts = generateAlerts(productMetrics, customerMetrics, inventoryMetrics, arAging);

  const totalRevenue = productMetrics.reduce((s, p) => s + p.revenue, 0);
  const totalCost = productMetrics.reduce((s, p) => s + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const grossMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalInvValue = inventoryMetrics.reduce((s, i) => s + i.inventoryValue, 0);
  const deadSlowValue = inventoryMetrics
    .filter((i) => i.isDeadStock || i.isSlowMoving)
    .reduce((s, i) => s + i.inventoryValue, 0);
  const openAR = arAging.reduce((s, a) => s + a.openBalance, 0);
  const activeCustomers = customerMetrics.filter((c) => c.orderCount > 0).length;
  const atRiskLost = customerMetrics.filter((c) => c.status === "at_risk" || c.status === "lost").length;
  const lowStockCount = inventoryMetrics.filter((i) => i.reorderStatus === "low" || i.reorderStatus === "reorder" || i.reorderStatus === "critical").length;
  const slowMovingCount = inventoryMetrics.filter((i) => i.isSlowMoving || i.isDeadStock).length;

  const topProductsByRevenue = productMetrics.slice(0, 5);
  const topProductsByProfit = [...productMetrics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);
  const topCustomersByRevenue = customerMetrics.slice(0, 5);
  const topCustomersByProfit = [...customerMetrics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 5);
  const biggestAlerts = alerts.filter((a) => a.severity === "high" || a.severity === "critical").slice(0, 5);
  const opportunities = alerts.filter((a) => a.type === "sales_opportunity").slice(0, 5);

  const productColumns: Column<ProductMetrics>[] = [
    { key: "sku", header: "SKU" },
    { key: "productName", header: "Product" },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "grossProfit", header: "Profit", render: (r) => formatCurrency(r.grossProfit) },
  ];
  const customerColumns: Column<CustomerMetrics>[] = [
    { key: "customerName", header: "Customer" },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "grossProfit", header: "Profit", render: (r) => formatCurrency(r.grossProfit) },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <DashboardHeaderWithSuspense title="Executive Overview" />
        <div className="p-6 flex items-center justify-center text-muted-foreground">Loading data…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen">
        <DashboardHeaderWithSuspense title="Executive Overview" />
        <div className="p-6 text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Executive Overview" />
      {source === "quickbooks" && (
        <div className="px-6 py-2 text-xs text-muted-foreground border-b bg-muted/30">
          Data from QuickBooks • Run Sync to refresh
        </div>
      )}
      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Key metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard title="Total revenue" value={formatCurrency(totalRevenue)} />
            <KpiCard title="Gross profit" value={formatCurrency(totalProfit)} />
            <KpiCard title="Gross margin %" value={formatPercent(grossMarginPct)} />
            <KpiCard title="Inventory value" value={formatCurrency(totalInvValue)} href="/inventory" />
            <KpiCard title="Dead / slow inventory" value={formatCurrency(deadSlowValue)} href="/inventory" />
            <KpiCard title="Open AR" value={formatCurrency(openAR)} href="/receivables" />
            <KpiCard title="Active customers" value={activeCustomers} href="/customers" />
            <KpiCard title="At-risk / inactive" value={atRiskLost} href="/customers" />
            <KpiCard title="Low-stock SKUs" value={lowStockCount} href="/inventory" />
            <KpiCard title="Slow-moving SKUs" value={slowMovingCount} href="/inventory" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 products by revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topProductsByRevenue}
                columns={productColumns}
                keyField="productId"
                onRowClick={(r) => window.location.assign(`/products/${r.productId}`)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 products by profit</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topProductsByProfit}
                columns={productColumns}
                keyField="productId"
                onRowClick={(r) => window.location.assign(`/products/${r.productId}`)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 customers by revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topCustomersByRevenue}
                columns={customerColumns}
                keyField="customerId"
                onRowClick={(r) => window.location.assign(`/customers/${r.customerId}`)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 customers by profit</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topCustomersByProfit}
                columns={customerColumns}
                keyField="customerId"
                onRowClick={(r) => window.location.assign(`/customers/${r.customerId}`)}
              />
            </CardContent>
          </Card>
        </div>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Biggest alerts this week</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {biggestAlerts.length > 0 ? biggestAlerts.map((a) => <InsightCard key={a.id} alert={a} />) : (
              <Card><CardContent className="py-6 text-muted-foreground">No high-priority alerts.</CardContent></Card>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Opportunities</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {opportunities.length > 0 ? opportunities.map((a) => <InsightCard key={a.id} alert={a} />) : (
              <Card><CardContent className="py-6 text-muted-foreground">No specific opportunities this period.</CardContent></Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
