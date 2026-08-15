"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Flame,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, getApiError } from "@/lib/api";
import { celebrateHabitCompletion } from "@/lib/confetti";
import { getLocalDateKey } from "@/lib/format";
import type { Category, Goal, Habit } from "@/lib/types";

const frequencyLabels = {
  DAILY: "Daily",
  WEEKDAYS: "Weekdays",
  WEEKENDS: "Weekends",
} as const;

export default function HabitsPage() {
  const { refreshUser } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const today = getLocalDateKey();

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
    setEditingHabit(null);
    setFormOpen(true);
  }

  function editHabit(habit: Habit) {
    setEditingHabit(habit);
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

  async function deleteHabit(habit: Habit) {
    if (!window.confirm(`Delete “${habit.title}”?`)) return;
    try {
      await api.delete(`/habits/${habit.id}`);
      setHabits((current) => current.filter((item) => item.id !== habit.id));
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
      toast.success("Habit deleted");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Build consistency with daily rituals
          </p>
        </div>
        <div>
          <Button onClick={createHabit}>
            <Plus className="size-4" /> New Habit
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : habits.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => {
            const completedToday = habit.logs.some(
              (log) => log.date === today && log.completed,
            );
            return (
              <Card key={habit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryBadge category={habit.category} />
                        <Badge variant="secondary" className="gap-1">
                          <Flame className="size-3 text-orange-500" />
                          {habit.currentStreak} day streak
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{habit.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Habit actions"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editHabit(habit)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void deleteHabit(habit)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {frequencyLabels[habit.frequency]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {habit.goal?.title ?? "Independent ritual"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={completedToday ? "default" : "outline"}
                      onClick={() => void toggleToday(habit)}
                    >
                      <Check className="size-4" />
                      {completedToday ? "Done today" : "Mark done"}
                    </Button>
                  </div>
                  <MonthlyDots habit={habit} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
          <Flame className="size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No habits yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Start with one small ritual you can repeat today.
          </p>
          <Button className="mt-4" variant="outline" onClick={createHabit}>
            <Plus className="size-4" /> Create your first habit
          </Button>
        </div>
      )}

      <HabitFormDialog
        key={`${editingHabit?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        goals={goals}
        habit={editingHabit}
        onSaved={() => void loadData()}
      />
    </div>
  );
}
