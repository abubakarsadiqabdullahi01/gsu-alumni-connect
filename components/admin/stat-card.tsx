'use client';

import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
  gradient?: string;
}

export function AdminStatCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
  gradient = "from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-0 shadow-sm bg-gradient-to-br",
        gradient,
        className
      )}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Top row: Icon and value */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white/50 dark:bg-black/20">
              {icon}
            </div>
          </div>

          {/* Bottom row: Description or trend */}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {trend && (
            <div className="flex items-center gap-1">
              <TrendingUp
                className={cn(
                  "size-3.5",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.positive ? "+" : "-"}
                {trend.value}% from last month
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
