"use client";

import { useState } from "react";
import { useData } from "@/hooks/useData";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/analytics/DataTable";
import { useDateRange } from "@/contexts/DateRangeContext";
import {
  computeProductMetrics,
  computeCustomerMetrics,
  computeInventoryMetrics,
  computeARAging,
} from "@/lib/metrics";
import { generateAlerts } from "@/lib/insights";
import { askAgent } from "@/lib/insights/ask-agent";

const SUGGESTED = [
  "What were our top products last month?",
  "Which products are not selling?",
  "Which customers have stopped buying?",
  "Which customers made us most profit?",
  "Which SKUs hold the most money in stock?",
  "What are the biggest problems this week?",
  "What should we reorder now?",
  "Which customers should we contact this week?",
];

export default function AskAgentPage() {
  const { range } = useDateRange();
  const { data } = useData();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof askAgent> | null>(null);

  const productMetrics = computeProductMetrics(range, data);
  const customerMetrics = computeCustomerMetrics(range, data);
  const inventoryMetrics = computeInventoryMetrics(data);
  const arAging = computeARAging(data);
  const alerts = generateAlerts(productMetrics, customerMetrics, inventoryMetrics, arAging);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const result = askAgent(query.trim(), {
      productMetrics,
      customerMetrics,
      inventoryMetrics,
      arAging,
      alerts,
    });
    setAnswer(result);
  };

  const handleSuggestion = (q: string) => {
    setQuery(q);
    const result = askAgent(q, {
      productMetrics,
      customerMetrics,
      inventoryMetrics,
      arAging,
      alerts,
    });
    setAnswer(result);
  };

  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Ask the Analytics Agent" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask a question</CardTitle>
            <p className="text-sm text-muted-foreground">
              Get answers, tables, and recommended actions. Try the suggestions below or type your own.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="e.g. Which products are not selling?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Ask</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestion(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {answer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Answer</CardTitle>
              <p className="text-sm text-muted-foreground">Query: &quot;{answer.query}&quot;</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium text-foreground">{answer.directAnswer}</p>
              </div>
              {answer.explanation && (
                <p className="text-sm text-muted-foreground">{answer.explanation}</p>
              )}
              {answer.recommendedAction && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">Recommended action</p>
                  <p className="text-sm text-muted-foreground">{answer.recommendedAction}</p>
                </div>
              )}
              {answer.dataType === "table" && answer.data.length > 0 && answer.columns && (
                <DataTable
                  data={answer.data as Record<string, unknown>[]}
                  columns={answer.columns.map((key) => ({ key, header: key }))}
                  keyField={(row) => answer.columns!.map((c) => String(row[c] ?? "")).join("|")}
                />
              )}
              {answer.dataType === "cards" && answer.data.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {(answer.data as { title: string; severity?: string; action?: string }[]).map((card, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <p className="font-medium">{card.title}</p>
                        {card.severity && <p className="text-xs text-muted-foreground mt-1">Severity: {card.severity}</p>}
                        {card.action && <p className="text-sm mt-2">{card.action}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
