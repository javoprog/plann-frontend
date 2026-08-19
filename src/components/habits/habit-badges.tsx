"use client";

import { Flame, Repeat2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import type { HabitFrequency } from "@/lib/types";

export function HabitFrequencyBadge({
  frequency,
}: {
  frequency: HabitFrequency;
}) {
  const { t } = useLanguage();
  const labelKey =
    frequency === "DAILY"
      ? "frequency.daily"
      : frequency === "WEEKDAYS"
        ? "frequency.weekdays"
        : "frequency.weekends";

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Repeat2 />
      {t(labelKey)}
    </Badge>
  );
}

export function StreakBadge({ count }: { count: number }) {
  const { t } = useLanguage();

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Flame />
      {t("common.dayStreak", { count })}
    </Badge>
  );
}
