"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { getLocalDateKey } from "@/lib/format";
import type { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MonthlyDots({ habit }: { habit: Habit }) {
  const { t } = useLanguage();
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const completed = new Set(
    habit.logs.filter((log) => log.completed).map((log) => log.date),
  );
  const today = getLocalDateKey(now);

  return (
    <div
      className="flex flex-wrap gap-1.5"
      aria-label={t("common.monthlyHistory")}
    >
      {Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
        const dateKey = getLocalDateKey(date);
        return (
          <span
            key={dateKey}
            title={`${dateKey}: ${
              completed.has(dateKey)
                ? t("common.completed")
                : t("common.notCompleted")
            }`}
            className={cn(
              "size-2.5 rounded-full bg-muted",
              completed.has(dateKey) && "bg-emerald-500",
              dateKey === today &&
                !completed.has(dateKey) &&
                "ring-1 ring-primary ring-offset-1 ring-offset-background",
            )}
          />
        );
      })}
    </div>
  );
}
