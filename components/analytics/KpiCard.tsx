import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatNumber, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number | null;
  href?: string;
  className?: string;
}

export function KpiCard({ title, value, subtitle, trend, href, className }: KpiCardProps) {
  const content = (
    <Card className={cn("font-mono-nums", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {trend !== undefined && trend !== null && (
          <span
            className={cn(
              "flex items-center text-xs",
              trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
            )}
          >
            {trend > 0 ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : trend < 0 ? <TrendingDown className="h-3.5 w-3.5 mr-0.5" /> : <Minus className="h-3.5 w-3.5 mr-0.5" />}
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
