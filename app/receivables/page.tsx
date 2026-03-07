"use client";

import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/analytics/DataTable";
import { Badge } from "@/components/ui/badge";
import { computeARAging } from "@/lib/metrics";
import { formatCurrency } from "@/lib/utils";
import type { ARAgingRow } from "@/types";

export default function ReceivablesDashboardPage() {
  const { data, isLoading } = useData();
  const arAging = computeARAging(data);
  const totalAR = arAging.reduce((s, a) => s + a.openBalance, 0);
  const totalOverdue = arAging.reduce(
    (s, a) =>
      s + a.overdue1to30 + a.overdue31to60 + a.overdue61to90 + a.overdue90Plus,
    0
  );

  const columns: Column<ARAgingRow>[] = [
    { key: "customerName", header: "Customer" },
    { key: "openBalance", header: "Open balance", render: (r) => formatCurrency(r.openBalance) },
    { key: "current", header: "Current", render: (r) => formatCurrency(r.current) },
    { key: "overdue1to30", header: "1–30 overdue", render: (r) => formatCurrency(r.overdue1to30) },
    { key: "overdue31to60", header: "31–60 overdue", render: (r) => formatCurrency(r.overdue31to60) },
    { key: "overdue61to90", header: "61–90 overdue", render: (r) => formatCurrency(r.overdue61to90) },
    { key: "overdue90Plus", header: "90+ overdue", render: (r) => formatCurrency(r.overdue90Plus) },
    { key: "openInvoiceCount", header: "Open invoices" },
    { key: "lastPaymentDate", header: "Last payment", render: (r) => r.lastPaymentDate ?? "—" },
    {
      key: "riskFlag",
      header: "Risk",
      render: (r) => (
        <Badge
          variant={
            r.riskFlag === "high" ? "destructive" : r.riskFlag === "medium" ? "warning" : "secondary"
          }
        >
          {r.riskFlag}
        </Badge>
      ),
    },
  ];

  if (isLoading) return <div className="min-h-screen"><DashboardHeaderWithSuspense title="Accounts Receivable" /><div className="p-6">Loading…</div></div>;
  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Accounts Receivable" />
      <div className="p-6 space-y-8">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <span className="text-sm font-medium text-muted-foreground">Total open AR</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-mono-nums">{formatCurrency(totalAR)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <span className="text-sm font-medium text-muted-foreground">Total overdue</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-mono-nums">{formatCurrency(totalOverdue)}</div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AR aging by customer</CardTitle>
            <p className="text-sm text-muted-foreground">Current and overdue buckets</p>
          </CardHeader>
          <CardContent>
            {arAging.length > 0 ? (
              <DataTable data={arAging} columns={columns} keyField="customerId" />
            ) : (
              <p className="text-muted-foreground py-6">No open receivables.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
