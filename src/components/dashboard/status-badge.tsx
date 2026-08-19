"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import type { GoalStatus } from "@/lib/types";

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
  const variants = {
    PLANNED: "outline",
    IN_PROGRESS: "secondary",
    COMPLETED: "default",
    CANCELLED: "destructive",
  } as const;
  return (
    <Badge variant={variants[status]} className={className}>
      {labels[status]}
    </Badge>
  );
}
