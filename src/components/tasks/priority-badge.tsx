"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import type { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityClasses: Record<Priority, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  MEDIUM:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  HIGH: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const { t } = useLanguage();
  const labels = {
    LOW: t("priority.low"),
    MEDIUM: t("priority.medium"),
    HIGH: t("priority.high"),
  };
  return (
    <Badge
      variant="outline"
      className={cn(priorityClasses[priority], className)}
    >
      {labels[priority]}
    </Badge>
  );
}
