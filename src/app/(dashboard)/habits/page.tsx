"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { api, getApiError } from "@/lib/api";
import { celebrateHabitCompletion } from "@/lib/confetti";
import { getLocalDateKey } from "@/lib/format";
import type { Category, Goal, Habit } from "@/lib/types";

export default function HabitsPage() {
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [sort, setSort] = useState<"streak" | "name">("streak");
  const today = getLocalDateKey();
  const sortedHabits = useMemo(
    () =>
      [...habits].sort((first, second) =>
        sort === "streak"
          ? second.currentStreak - first.currentStreak
          : first.title.localeCompare(second.title),
      ),
    [habits, sort],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
    } catch (error) {
      toast.error(getApiError(error));
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
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("habits.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("habits.description")}
          </p>
        </div>
        <div>
          <Button onClick={createHabit}>
            <Plus className="size-4" /> {t("actions.newHabit")}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as "streak" | "name")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <span>
              {sort === "streak"
                ? t("habits.sortStreak")
                : t("habits.sortName")}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="streak">{t("habits.sortStreak")}</SelectItem>
            <SelectItem value="name">{t("habits.sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : habits.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedHabits.map((habit) => {
            const completedToday = habit.logs.some(
              (log) => log.date === today && log.completed,
            );
            return (
              <Card
                key={habit.id}
                className="transition-colors hover:border-primary/30"
              >
                <Link
                  href={`/habits/${encodeURIComponent(habit.id)}`}
                  className="block rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CardHeader>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={habit.category} />
                        <Badge variant="secondary" className="gap-1">
                          <Flame className="size-3 text-orange-500" />
                          {t("common.dayStreak", {
                            count: habit.currentStreak,
                          })}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{habit.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <div>
                      <p className="text-sm font-medium">
                        {t(
                          habit.frequency === "DAILY"
                            ? "frequency.daily"
                            : habit.frequency === "WEEKDAYS"
                              ? "frequency.weekdays"
                              : "frequency.weekends",
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {habit.goal?.title ?? t("habits.independent")}
                      </p>
                    </div>
                    <MonthlyDots habit={habit} />
                  </CardContent>
                </Link>
                <CardContent className="pt-0">
                  <Button
                    className="w-full"
                    size="sm"
                    variant={completedToday ? "default" : "outline"}
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
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
          <Flame className="size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">{t("habits.noHabits")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("habits.smallRitualHint")}
          </p>
          <Button className="mt-4" variant="outline" onClick={createHabit}>
            <Plus className="size-4" /> {t("actions.createHabit")}
          </Button>
        </div>
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
