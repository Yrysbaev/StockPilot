"use client";

import { useState, useEffect, useCallback } from "react";
import type { AnalyticsData } from "@/types";

export function useData(): {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  source: "quickbooks" | "mock" | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"quickbooks" | "mock" | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData({
        products: json.products,
        customers: json.customers,
        invoices: json.invoices,
        invoiceItems: json.invoiceItems,
        inventorySnapshots: json.inventorySnapshots,
      });
      setSource(json.source ?? "mock");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
      setData(null);
      setSource(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, source, refetch: fetchData };
}
