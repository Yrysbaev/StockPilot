import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";
import { AlertTriangle, Info, ArrowRight } from "lucide-react";

const severityStyles: Record<Alert["severity"], string> = {
  critical: "bg-red-500/10 text-red-700 border-red-200",
  high: "bg-amber-500/10 text-amber-700 border-amber-200",
  medium: "bg-blue-500/10 text-blue-700 border-blue-200",
  low: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export function InsightCard({ alert }: { alert: Alert }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <Badge
              variant="outline"
              className={cn("text-xs", severityStyles[alert.severity])}
            >
              {alert.severity}
            </Badge>
            <h4 className="font-semibold leading-tight">{alert.title}</h4>
          </div>
          <Link
            href={alert.linkPath}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{alert.explanation}</p>
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="font-medium text-foreground">Suggested action</p>
          <p className="text-muted-foreground">{alert.suggestedAction}</p>
        </div>
        {Object.keys(alert.supportingMetrics).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(alert.supportingMetrics).map(([k, v]) => (
              <span key={k} className="text-xs text-muted-foreground">
                {k}: {typeof v === "number" && v > 1000 ? `$${v.toLocaleString()}` : v}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
