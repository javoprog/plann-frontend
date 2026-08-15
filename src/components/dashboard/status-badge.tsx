"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import type { GoalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<GoalStatus, string> = {
  PLANNED: "border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  IN_PROGRESS:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  CANCELLED:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
};

export function StatusBadge({
  status,
  className,
}: {
  status: GoalStatus;
  className?: string;
}) {
  const { t } = useLanguage();
  const labels = {
    PLANNED: t("status.planned"),
    IN_PROGRESS: t("status.inProgress"),
    COMPLETED: t("status.completed"),
    CANCELLED: t("status.cancelled"),
  };
  return (
    <Badge
      variant="outline"
      className={cn(statusClasses[status], className)}
    >
      {labels[status]}
    </Badge>
  );
}
