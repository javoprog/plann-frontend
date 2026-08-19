"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Flame, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import {
  HabitFrequencyBadge,
  StreakBadge,
} from "@/components/habits/habit-badges";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import {
  EmptyState,
  LoadError,
  PageSkeleton,
} from "@/components/shared/async-state";
import {
  CollectionFilter,
  CollectionSort,
  CollectionToolbar,
} from "@/components/shared/collection-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCategoryFilter } from "@/hooks/use-category-filter";
import { api, getApiError } from "@/lib/api";
import { celebrateHabitCompletion } from "@/lib/confetti";
import { getCategoryLabel } from "@/lib/constants/categories";
import { getLocalDateKey } from "@/lib/format";
import type { Category, Goal, Habit, HabitFrequency } from "@/lib/types";

type HabitSort = "streak" | "name";
type HabitFrequencyFilter = HabitFrequency | "all";

function HabitsContent() {
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const { categoryId, changeCategory } = useCategoryFilter("/habits");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sort, setSort] = useState<HabitSort>("streak");
  const [frequencyFilter, setFrequencyFilter] =
    useState<HabitFrequencyFilter>("all");
  const today = getLocalDateKey();
  const visibleHabits = useMemo(() => {
    const filtered = habits.filter(
      (habit) =>
        (categoryId === "all" || habit.category?.id === categoryId) &&
        (frequencyFilter === "all" || habit.frequency === frequencyFilter),
    );
    return [...filtered].sort((first, second) =>
        sort === "streak"
          ? second.currentStreak - first.currentStreak
          : first.title.localeCompare(second.title),
      );
  }, [categoryId, frequencyFilter, habits, sort]);
  const hasActiveFilters =
    categoryId !== "all" || frequencyFilter !== "all";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [habitsResponse, categoriesResponse, goalsResponse] =
        await Promise.all([
          api.get<Habit[]>("/habits"),
          api.get<Category[]>("/categories"),
          api.get<Goal[]>("/goals"),
        ]);
      setHabits(habitsResponse.data);
      setCategories(categoriesResponse.data);
      setGoals(goalsResponse.data);
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  function createHabit() {
    setFormOpen(true);
  }

  async function toggleToday(habit: Habit) {
    if (updatingHabitId) return;
    setUpdatingHabitId(habit.id);
    const wasCompleted = habit.logs.some(
      (log) => log.date === today && log.completed,
    );
    setHabits((current) =>
      current.map((item) => {
        if (item.id !== habit.id) return item;
        return {
          ...item,
          currentStreak: Math.max(
            0,
            item.currentStreak + (wasCompleted ? -1 : 1),
          ),
          logs: wasCompleted
            ? item.logs.filter((log) => log.date !== today)
            : [
                ...item.logs,
                { habitId: item.id, date: today, completed: true },
              ],
        };
      }),
    );

    try {
      await api.post(`/habits/${habit.id}/toggle`, { date: today });
      const { data } = await api.get<Habit[]>("/habits");
      setHabits(data);
      if (!wasCompleted) celebrateHabitCompletion();
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
    } catch (error) {
      setHabits((current) =>
        current.map((item) => (item.id === habit.id ? habit : item)),
      );
      toast.error(getApiError(error));
    } finally {
      setUpdatingHabitId(null);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        title={t("habits.title")}
        description={t("habits.description")}
        action={
          <Button onClick={createHabit}>
            <Plus className="size-4" /> {t("actions.createHabit")}
          </Button>
        }
      />

      <CollectionToolbar
        sort={
          <CollectionSort
            id="habit-sort"
            label={t("common.sortBy")}
            value={sort}
            options={[
              { value: "streak", label: t("habits.sortStreak") },
              { value: "name", label: t("habits.sortName") },
            ]}
            onValueChange={setSort}
          />
        }
      >
        <CollectionFilter
          label={t("form.category")}
          value={categoryId}
          options={[
            { value: "all", label: t("common.all") },
            ...categories.map((category) => ({
              value: category.id,
              label: getCategoryLabel(category.name, t),
            })),
          ]}
          onValueChange={changeCategory}
          className="basis-full"
        />
        <CollectionFilter
          label={t("form.frequency")}
          value={frequencyFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "DAILY", label: t("frequency.daily") },
            { value: "WEEKDAYS", label: t("frequency.weekdays") },
            { value: "WEEKENDS", label: t("frequency.weekends") },
          ]}
          onValueChange={setFrequencyFilter}
        />
      </CollectionToolbar>

      {isLoading ? (
        <PageSkeleton />
      ) : loadFailed ? (
        <LoadError onRetry={() => void loadData()} />
      ) : visibleHabits.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleHabits.map((habit) => {
            const completedToday = habit.logs.some(
              (log) => log.date === today && log.completed,
            );
            return (
              <Card
                key={habit.id}
                className="transition-colors hover:bg-muted/30"
              >
                <Link
                  href={`/habits/${encodeURIComponent(habit.id)}`}
                  className="block rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={habit.category} />
                        <HabitFrequencyBadge frequency={habit.frequency} />
                        <StreakBadge count={habit.currentStreak} />
                      </div>
                      <CardTitle className="text-lg">{habit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <p className="text-xs text-muted-foreground">
                      {habit.goal?.title ?? t("habits.independent")}
                    </p>
                    <MonthlyDots habit={habit} />
                  </CardContent>
                </Link>
                <CardContent className="pt-0">
                  <Button
                    className="w-full"
                    size="sm"
                    variant={completedToday ? "default" : "outline"}
                    disabled={Boolean(updatingHabitId)}
                    onClick={() => void toggleToday(habit)}
                  >
                    <Check className="size-4" />
                    {completedToday
                      ? t("actions.doneToday")
                      : t("actions.markDone")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Flame}
          title={t("habits.noHabits")}
          description={t(
            hasActiveFilters
              ? "habits.filterHint"
              : "habits.smallRitualHint",
          )}
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  changeCategory("all");
                  setFrequencyFilter("all");
                }}
              >
                <RotateCcw /> {t("actions.clearFilters")}
              </Button>
            ) : (
              <Button variant="outline" onClick={createHabit}>
                <Plus /> {t("actions.createHabit")}
              </Button>
            )
          }
        />
      )}

      <HabitFormDialog
        key={`new-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        goals={goals}
        onSaved={() => void loadData()}
      />
    </div>
  );
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HabitsContent />
    </Suspense>
  );
}
