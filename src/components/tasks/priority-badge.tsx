"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import type { Priority } from "@/lib/types";

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
  const variants = {
    LOW: "outline",
    MEDIUM: "secondary",
    HIGH: "destructive",
  } as const;
  return (
    <Badge variant={variants[priority]} className={className}>
      {labels[priority]}
    </Badge>
  );
}
