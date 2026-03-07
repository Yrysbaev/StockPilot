"use client";

import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { Badge } from "@/components/ui/badge";
import { computeCustomerMetrics } from "@/lib/metrics";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CustomerMetrics } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

const statusVariant: Record<
  CustomerMetrics["status"],
  "default" | "secondary" | "destructive" | "outline" | "warning"
> = {
  active: "default",
  at_risk: "warning",
  lost: "destructive",
  new: "secondary",
};

export default function CustomersDashboardPage() {
  const { range } = useDateRange();
  const { data, isLoading } = useData();
  const customerMetrics = computeCustomerMetrics(range, data);

  const trendData = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        week: `W${8 - i}`,
        revenue: Math.round(15000 + Math.random() * 10000),
        customers: Math.round(20 + Math.random() * 15),
      })).reverse(),
    []
  );

  const topByRevenue = customerMetrics.slice(0, 15);
  const topByProfit = [...customerMetrics].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 15);
  const inactive = customerMetrics.filter((c) => c.status === "lost");
  const atRisk = customerMetrics.filter((c) => c.status === "at_risk");
  const newCustomers = customerMetrics.filter((c) => c.status === "new");

  const columns: Column<CustomerMetrics>[] = [
    { key: "customerName", header: "Customer" },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "grossProfit", header: "Gross profit", render: (r) => formatCurrency(r.grossProfit) },
    { key: "grossMarginPct", header: "Margin %", render: (r) => formatPercent(r.grossMarginPct) },
    { key: "orderCount", header: "Orders" },
    { key: "averageOrderValue", header: "AOV", render: (r) => formatCurrency(r.averageOrderValue) },
    { key: "lastOrderDate", header: "Last order", render: (r) => r.lastOrderDate ?? "—" },
    { key: "daysSinceLastOrder", header: "Days since order", render: (r) => r.daysSinceLastOrder ?? "—" },
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
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace("_", " ")}</Badge>,
    },
  ];

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Customer Dashboard" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Customer Dashboard" />
      <div className="p-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), ""]} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top customers by revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByRevenue} columns={columns} keyField="customerId" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top customers by gross profit</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable data={topByProfit} columns={columns} keyField="customerId" />
          </CardContent>
        </Card>

        {atRisk.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">At-risk customers</CardTitle>
              <p className="text-sm text-muted-foreground">Buying less or longer than usual since last order</p>
            </CardHeader>
            <CardContent>
              <DataTable data={atRisk} columns={columns} keyField="customerId" />
            </CardContent>
          </Card>
        )}

        {inactive.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inactive / lost customers</CardTitle>
              <p className="text-sm text-muted-foreground">No orders in 90+ days</p>
            </CardHeader>
            <CardContent>
              <DataTable data={inactive} columns={columns} keyField="customerId" />
            </CardContent>
          </Card>
        )}

        {newCustomers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New customers</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable data={newCustomers} columns={columns} keyField="customerId" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
