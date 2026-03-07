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
  computeProductMetrics,
  computeInventoryMetrics,
  computeCustomerMetrics,
  computeARAging,
} from "@/lib/metrics";
import { generateAlerts } from "@/lib/insights";
import { mockProducts } from "@/lib/data/mock-products";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductMetrics, InventoryMetrics, Alert } from "@/types";
import { ArrowLeft } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { range } = useDateRange();
  const { data } = useData();
  const productsList = data?.products ?? mockProducts;
  const product = productsList.find((p) => p.id === id);
  const productMetrics = computeProductMetrics(range, data);
  const inventoryMetrics = computeInventoryMetrics(data);
  const customerMetrics = computeCustomerMetrics(range, data);
  const arAging = computeARAging(data);
  const alerts = generateAlerts(productMetrics, customerMetrics, inventoryMetrics, arAging);

  const metrics = productMetrics.find((m) => m.productId === id);
  const inventory = inventoryMetrics.find((i) => i.productId === id);
  const productAlerts = alerts.filter((a) => a.entityType === "product" && a.entityId === id);

  if (!product) {
    return (
      <div className="min-h-screen">
        <DashboardHeaderWithSuspense title="Product" />
        <div className="p-6">
          <p className="text-muted-foreground">Product not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/sales")}>
            Back to Sales
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Product detail" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              SKU: {product.sku} · {product.category} · {product.brand}
            </p>
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
              <span className="text-sm text-muted-foreground">Gross margin %</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? formatPercent(metrics.grossMarginPct) : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm text-muted-foreground">Units sold</span>
            </CardHeader>
            <CardContent className="text-xl font-semibold font-mono-nums">
              {metrics ? metrics.unitsSold : "—"}
            </CardContent>
          </Card>
        </div>

        {inventory && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity on hand</span>
                <p className="font-semibold font-mono-nums">{inventory.quantityOnHand}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Inventory value</span>
                <p className="font-semibold font-mono-nums">{formatCurrency(inventory.inventoryValue)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Days since last sale</span>
                <p className="font-semibold font-mono-nums">{inventory.daysSinceLastSale ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Weeks of supply</span>
                <p className="font-semibold font-mono-nums">{inventory.weeksOfSupply ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {productAlerts.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Related alerts</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {productAlerts.map((a) => (
                <InsightCard key={a.id} alert={a} />
              ))}
            </div>
          </section>
        )}

        {productAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {productAlerts[0].suggestedAction}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
