"use client";

import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { computeProductMetrics } from "@/lib/metrics";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductMetrics } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

export default function ProfitabilityDashboardPage() {
  const { range } = useDateRange();
  const { data, isLoading } = useData();
  const productMetrics = computeProductMetrics(range, data);

  const byCategory = useMemo(() => {
    const m = new Map<string, { revenue: number; cost: number; profit: number; units: number }>();
    productMetrics.forEach((p) => {
      const cat = p.category || "Other";
      const curr = m.get(cat) ?? { revenue: 0, cost: 0, profit: 0, units: 0 };
      curr.revenue += p.revenue;
      curr.cost += p.cost;
      curr.profit += p.grossProfit;
      curr.units += p.unitsSold;
      m.set(cat, curr);
    });
    return Array.from(m.entries()).map(([name, v]) => ({
      name,
      ...v,
      margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
    }));
  }, [productMetrics]);

  const topByProfit = [...productMetrics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 15);
  const topByMargin = [...productMetrics].filter((p) => p.unitsSold >= 5).sort((a, b) => b.grossMarginPct - a.grossMarginPct).slice(0, 15);
  const lowMargin = productMetrics.filter((p) => p.revenue > 500 && p.grossMarginPct < 20);
  const highVolumeLowMargin = productMetrics.filter((p) => p.unitsSold > 50 && p.grossMarginPct < 15);

  const columns: Column<ProductMetrics>[] = [
    { key: "sku", header: "SKU" },
    { key: "productName", header: "Product" },
    { key: "category", header: "Category" },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "cost", header: "Cost", render: (r) => formatCurrency(r.cost) },
    { key: "grossProfit", header: "Gross profit", render: (r) => formatCurrency(r.grossProfit) },
    { key: "grossMarginPct", header: "Margin %", render: (r) => formatPercent(r.grossMarginPct) },
    { key: "unitsSold", header: "Units sold" },
    { key: "avgSellingPrice", header: "Avg price", render: (r) => formatCurrency(r.avgSellingPrice) },
    {
      key: "profitPerUnit",
      header: "Profit/unit",
      render: (r) => formatCurrency(r.unitsSold > 0 ? (r.revenue - r.cost) / r.unitsSold : 0),
    },
  ];

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Profitability Dashboard" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Profitability Dashboard" />
      <div className="p-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profit by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), ""]} />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" name="Gross profit" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product profitability (top by profit)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByProfit} columns={columns} keyField="productId" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best margin products (min 5 units sold)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByMargin} columns={columns} keyField="productId" />
          </CardContent>
        </Card>

        {lowMargin.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low-margin products (revenue &gt; $500, margin &lt; 20%)</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={lowMargin} columns={columns} keyField="productId" />
            </CardContent>
          </Card>
        )}

        {highVolumeLowMargin.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">High volume / low margin</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={highVolumeLowMargin} columns={columns} keyField="productId" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
