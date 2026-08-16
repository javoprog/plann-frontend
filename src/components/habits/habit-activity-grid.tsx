"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { getLocalDateKey } from "@/lib/format";
import type { Habit, HabitFrequency } from "@/lib/types";
import { cn } from "@/lib/utils";

export function isHabitScheduled(
  date: Date,
  frequency: HabitFrequency,
) {
  const weekday = date.getDay();
  if (frequency === "WEEKDAYS") return weekday >= 1 && weekday <= 5;
  if (frequency === "WEEKENDS") return weekday === 0 || weekday === 6;
  return true;
}

export function getLastThirtyDays(today = new Date()) {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    return date;
  });
}

interface HabitActivityGridProps {
  habit: Habit;
  updatingDate?: string | null;
  onToggle: (date: string) => void;
}

export function HabitActivityGrid({
  habit,
  updatingDate,
  onToggle,
}: HabitActivityGridProps) {
  const { language, t } = useLanguage();
  const completedDates = new Set(
    habit.logs.filter((log) => log.completed).map((log) => log.date),
  );

  return (
    <div
      className="grid grid-cols-10 gap-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]"
      aria-label={t("habits.activityLast30Days")}
    >
      {getLastThirtyDays().map((date) => {
        const dateKey = getLocalDateKey(date);
        const completed = completedDates.has(dateKey);
        const scheduled = isHabitScheduled(date, habit.frequency);
        const label = new Intl.DateTimeFormat(language, {
          month: "short",
          day: "numeric",
        }).format(date);

        return (
          <button
            key={dateKey}
            type="button"
            title={`${label}: ${
              completed ? t("common.completed") : t("common.notCompleted")
            }`}
            className={cn(
              "aspect-square min-h-5 rounded-md border bg-muted transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              completed && "border-emerald-500 bg-emerald-500",
              !scheduled && !completed && "border-dashed opacity-40",
              updatingDate === dateKey && "animate-pulse",
            )}
            aria-label={`${label}: ${
              completed ? t("common.completed") : t("common.notCompleted")
            }`}
            aria-pressed={completed}
            disabled={Boolean(updatingDate)}
            onClick={() => onToggle(dateKey)}
          />
        );
      })}
    </div>
  );
}
