import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-extrabold tracking-tight">{value}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold",
                  trend.positive ? "text-emerald-600" : "text-red-500"
                )}
              >
                {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
                <span className="font-normal text-muted-foreground">
                  vs last month
                </span>
              </p>
            )}
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
