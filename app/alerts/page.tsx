"use client";

import { useDateRange } from "@/contexts/DateRangeContext";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { InsightCard } from "@/components/analytics/InsightCard";
import { generateAlerts, ALERT_CATEGORY_LABELS } from "@/lib/insights";
import {
  computeProductMetrics,
  computeCustomerMetrics,
  computeInventoryMetrics,
  computeARAging,
} from "@/lib/metrics";
import type { Alert } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORY_ORDER: Alert["type"][] = [
  "inventory_risk",
  "cash_flow",
  "customer_retention",
  "profitability",
  "sales_opportunity",
];

export default function AlertsPage() {
  const { range } = useDateRange();
  const { data, isLoading } = useData();
  const productMetrics = computeProductMetrics(range, data);
  const customerMetrics = computeCustomerMetrics(range, data);
  const inventoryMetrics = computeInventoryMetrics(data);
  const arAging = computeARAging(data);
  const alerts = generateAlerts(productMetrics, customerMetrics, inventoryMetrics, arAging);

  const byCategory = CATEGORY_ORDER.map((type) => ({
    type,
    label: ALERT_CATEGORY_LABELS[type],
    items: alerts.filter((a) => a.type === type),
  })).filter((g) => g.items.length > 0);

  const highPriority = alerts.filter((a) => a.severity === "high" || a.severity === "critical");

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Alerts & Action Agent" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Alerts & Action Agent" />
      <div className="p-6 space-y-8">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Priority actions</h2>
          <p className="text-muted-foreground text-sm mb-4">
            These alerts are generated from your data. Each includes an explanation and a suggested action.
          </p>
          {highPriority.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {highPriority.map((alert) => (
                <InsightCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No high-priority alerts right now. Review categories below for medium and low priority items.
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Alerts by category</h2>
          {byCategory.map((group) => (
            <div key={group.type} className="mb-8">
              <h3 className="text-base font-semibold mb-4">{group.label}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {group.items.map((alert) => (
                  <InsightCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          ))}
          {byCategory.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No alerts in this period. Check back after data is updated.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
