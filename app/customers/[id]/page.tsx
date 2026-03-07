"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsightCard } from "@/components/analytics/InsightCard";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import {
  computeCustomerMetrics,
  computeARAging,
  computeProductMetrics,
  computeInventoryMetrics,
} from "@/lib/metrics";
import { generateAlerts } from "@/lib/insights";
import { mockCustomers } from "@/lib/data/mock-customers";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { CustomerMetrics, ARAgingRow } from "@/types";
import { ArrowLeft } from "lucide-react";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { range } = useDateRange();
  const { data } = useData();
  const customersList = data?.customers ?? mockCustomers;
  const customer = customersList.find((c) => c.id === id);
  const customerMetrics = computeCustomerMetrics(range, data);
  const productMetrics = computeProductMetrics(range, data);
  const inventoryMetrics = computeInventoryMetrics(data);
  const arAging = computeARAging(data);
  const alerts = generateAlerts(productMetrics, customerMetrics, inventoryMetrics, arAging);

  const metrics = customerMetrics.find((m) => m.customerId === id);
  const ar = arAging.find((a) => a.customerId === id);
  const customerAlerts = alerts.filter((a) => a.entityType === "customer" && a.entityId === id);

  if (!customer) {
    return (
      <div className="min-h-screen">
        <DashboardHeaderWithSuspense title="Customer" />
        <div className="p-6">
          <p className="text-muted-foreground">Customer not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/customers")}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Customer detail" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{customer.name}</h2>
            {customer.email && (
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            )}
            {metrics && (
              <Badge className="mt-2" variant={metrics.status === "active" ? "default" : metrics.status === "at_risk" ? "warning" : "destructive"}>
                {metrics.status.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm text-muted-foreground">Revenue (period)</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? formatCurrency(metrics.revenue) : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm text-muted-foreground">Gross profit</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? formatCurrency(metrics.grossProfit) : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm text-muted-foreground">Orders</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? metrics.orderCount : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm text-muted-foreground">Average order value</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? formatCurrency(metrics.averageOrderValue) : "—"}
            </CardContent>
          </Card>
        </div>

        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Last order</span>
                <p className="font-semibold">{metrics.lastOrderDate ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Days since last order</span>
                <p className="font-semibold font-mono-nums">{metrics.daysSinceLastOrder ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gross margin %</span>
                <p className="font-semibold font-mono-nums">{formatPercent(metrics.grossMarginPct)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Trend vs prior period</span>
                <p className="font-semibold font-mono-nums">
                  {metrics.trendVsPriorPct != null ? `${metrics.trendVsPriorPct >= 0 ? "+" : ""}${metrics.trendVsPriorPct.toFixed(1)}%` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {ar && ar.openBalance > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accounts receivable</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Open balance</span>
                <p className="font-semibold font-mono-nums">{formatCurrency(ar.openBalance)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Overdue (1–30)</span>
                <p className="font-semibold font-mono-nums">{formatCurrency(ar.overdue1to30)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Overdue (31–90)</span>
                <p className="font-semibold font-mono-nums">
                  {formatCurrency(ar.overdue31to60 + ar.overdue61to90)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Overdue 90+</span>
                <p className="font-semibold font-mono-nums">{formatCurrency(ar.overdue90Plus)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {customerAlerts.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Related alerts</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {customerAlerts.map((a) => (
                <InsightCard key={a.id} alert={a} />
              ))}
            </div>
          </section>
        )}

        {customerAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {customerAlerts[0].suggestedAction}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
