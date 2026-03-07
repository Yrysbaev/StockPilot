"use client";

import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { computeProductMetrics, getPriorPeriod } from "@/lib/metrics";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductMetrics } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useMemo } from "react";

export default function SalesDashboardPage() {
  const { range } = useDateRange();
  const { data, isLoading } = useData();
  const productMetrics = computeProductMetrics(range, data);
  const priorRange = getPriorPeriod(range);
  const priorMetrics = computeProductMetrics(priorRange, data);

  const bySku = useMemo(() => new Map(priorMetrics.map((p) => [p.sku, p])), [priorMetrics]);
  const withTrend = productMetrics.map((p) => ({
    ...p,
    trendVsPriorPct: (() => {
      const prior = bySku.get(p.sku);
      if (!prior || prior.revenue === 0) return null;
      return ((p.revenue - prior.revenue) / prior.revenue) * 100;
    })(),
  }));

  const topByUnits = [...productMetrics].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10);
  const topByRevenue = productMetrics.slice(0, 10);
  const topByProfit = [...productMetrics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 10);
  const noSales = productMetrics.length === 0 ? [] : []; // Would come from all products minus those with sales
  const slowSellers = [...productMetrics].filter((p) => p.unitsSold < 10).slice(0, 10);

  const trendData = useMemo(() => {
    const byDate = new Map<string, { revenue: number; units: number }>();
    // Mock: aggregate by week for last 12 weeks
    productMetrics.forEach((p) => {
      // We don't have daily breakdown in mock; use product revenue as single bucket
    });
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${12 - i}`,
      revenue: Math.round(10000 + Math.random() * 8000),
      units: Math.round(200 + Math.random() * 300),
    })).reverse();
  }, [productMetrics]);

  const productColumns: Column<ProductMetrics>[] = [
    { key: "sku", header: "SKU" },
    { key: "productName", header: "Product" },
    { key: "category", header: "Category" },
    { key: "unitsSold", header: "Units sold" },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "cost", header: "Cost", render: (r) => formatCurrency(r.cost) },
    { key: "grossProfit", header: "Gross profit", render: (r) => formatCurrency(r.grossProfit) },
    { key: "grossMarginPct", header: "Margin %", render: (r) => formatPercent(r.grossMarginPct) },
    { key: "avgSellingPrice", header: "Avg price", render: (r) => formatCurrency(r.avgSellingPrice) },
    { key: "lastSoldDate", header: "Last sold", render: (r) => r.lastSoldDate ?? "—" },
    {
      key: "trendVsPriorPct",
      header: "Trend vs prior",
      render: (r) =>
        r.trendVsPriorPct != null ? (
          <span className={r.trendVsPriorPct >= 0 ? "text-emerald-600" : "text-red-600"}>
            {r.trendVsPriorPct >= 0 ? "+" : ""}{r.trendVsPriorPct.toFixed(1)}%
          </span>
        ) : (
          "—"
        ),
    },
  ];

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Sales Dashboard" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Sales Dashboard" />
      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Sales trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), ""]} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Units sold trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="units" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products by units sold</CardTitle>
            <p className="text-sm text-muted-foreground">Selected period</p>
          </CardHeader>
          <CardContent>
            <DataTable data={topByUnits} columns={productColumns.slice(0, 6)} keyField="productId" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByRevenue} columns={productColumns} keyField="productId" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products by gross profit</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByProfit} columns={productColumns} keyField="productId" />
          </CardContent>
        </Card>

        {slowSellers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slow sellers (low units in period)</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={slowSellers} columns={productColumns} keyField="productId" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
