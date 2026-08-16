"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  History,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import {
  HabitActivityGrid,
  isHabitScheduled,
} from "@/components/habits/habit-activity-grid";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { useLanguage } from "@/components/providers/language-provider";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import {
  celebrateGoalCompletion,
  celebrateHabitCompletion,
} from "@/lib/confetti";
import { getLocalDateKey } from "@/lib/format";
import type { Category, Goal, Habit, HabitLog } from "@/lib/types";

function parseDateKey(date: string) {
  return new Date(`${date}T00:00:00`);
}

function calculateBestStreak(habit: Habit) {
  const completedDates = [...new Set(
    habit.logs.filter((log) => log.completed).map((log) => log.date),
  )].sort();
  if (!completedDates.length) return 0;

  const completed = new Set(completedDates);
  const cursor = parseDateKey(completedDates[0]);
  const last = parseDateKey(completedDates.at(-1)!);
  let current = 0;
  let best = 0;

  while (cursor <= last) {
    if (isHabitScheduled(cursor, habit.frequency)) {
      if (completed.has(getLocalDateKey(cursor))) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return best;
}

function calculateMonthlyRate(habit: Habit) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  const completed = new Set(
    habit.logs.filter((log) => log.completed).map((log) => log.date),
  );
  let scheduledDays = 0;
  let completedDays = 0;

  while (cursor <= today) {
    if (isHabitScheduled(cursor, habit.frequency)) {
      scheduledDays += 1;
      if (completed.has(getLocalDateKey(cursor))) completedDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : 0;
}

function HabitDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingDate, setUpdatingDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const today = getLocalDateKey();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [habitResponse, categoriesResponse, goalsResponse] =
        await Promise.all([
          api.get<Habit>(`/habits/${id}`),
          api.get<Category[]>("/categories"),
          api.get<Goal[]>("/goals"),
        ]);
      setHabit(habitResponse.data);
      setCategories(categoriesResponse.data);
      setGoals(goalsResponse.data);
    } catch (error) {
      toast.error(getApiError(error));
      setHabit(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const analytics = useMemo(() => {
    if (!habit) return { bestStreak: 0, monthlyRate: 0, totalCheckIns: 0 };
    return {
      bestStreak: calculateBestStreak(habit),
      monthlyRate: calculateMonthlyRate(habit),
      totalCheckIns: habit.logs.filter((log) => log.completed).length,
    };
  }, [habit]);

  const history = useMemo(
    () =>
      [...(habit?.logs ?? [])]
        .filter((log) => log.completed)
        .sort((left, right) => right.date.localeCompare(left.date)),
    [habit?.logs],
  );

  async function toggleDate(date: string) {
    if (!habit || updatingDate) return;
    const previousHabit = habit;
    const wasCompleted = habit.logs.some(
      (log) => log.date === date && log.completed,
    );
    const optimisticLog: HabitLog = {
      habitId: habit.id,
      date,
      completed: true,
      createdAt: new Date().toISOString(),
    };
    setHabit({
      ...habit,
      logs: wasCompleted
        ? habit.logs.filter((log) => log.date !== date)
        : [...habit.logs, optimisticLog],
    });
    setUpdatingDate(date);

    try {
      await api.post(`/habits/${habit.id}/toggle`, { date });
      const [habitResponse, habitsResponse] = await Promise.all([
        api.get<Habit>(`/habits/${habit.id}`),
        api.get<Habit[]>("/habits"),
      ]);
      setHabit(habitResponse.data);

      if (!wasCompleted && date === today) {
        const currentDate = new Date();
        const scheduledHabits = habitsResponse.data.filter((item) =>
          isHabitScheduled(currentDate, item.frequency),
        );
        const allCompleted =
          scheduledHabits.length > 0 &&
          scheduledHabits.every((item) =>
            item.logs.some(
              (log) => log.date === today && log.completed,
            ),
          );
        if (allCompleted) celebrateGoalCompletion();
        else celebrateHabitCompletion();
      }

      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
    } catch (error) {
      setHabit(previousHabit);
      toast.error(getApiError(error));
    } finally {
      setUpdatingDate(null);
    }
  }

  async function deleteHabit() {
    if (!habit || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/habits/${habit.id}`);
      toast.success(t("toast.habitDeleted"));
      void refreshUser().catch(() => undefined);
      router.replace("/habits");
    } catch (error) {
      toast.error(getApiError(error));
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  if (!habit) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
        <Flame className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">{t("habits.noHabits")}</p>
        <Link className="mt-3 text-sm hover:underline" href="/habits">
          {t("actions.backToHabits")}
        </Link>
      </div>
    );
  }

  const completedToday = habit.logs.some(
    (log) => log.date === today && log.completed,
  );

  return (
    <div className="flex flex-col space-y-6">
      <nav
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link className="hover:text-foreground" href="/habits">
          {t("nav.habits")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="max-w-64 truncate text-foreground">{habit.title}</span>
      </nav>

      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="space-y-6">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={habit.category} />
                <Badge variant="secondary">
                  {t(
                    habit.frequency === "DAILY"
                      ? "frequency.daily"
                      : habit.frequency === "WEEKDAYS"
                        ? "frequency.weekdays"
                        : "frequency.weekends",
                  )}
                </Badge>
                {habit.goal && (
                  <Link href={`/goals/${encodeURIComponent(habit.goal.id)}`}>
                    <Badge variant="outline" className="gap-1.5">
                      <Target className="size-3" /> {habit.goal.title}
                    </Badge>
                  </Link>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {habit.title}
              </h1>
              <p className="max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">
                {habit.description || t("common.noDescription")}
              </p>
            </div>
            <Button
              size="lg"
              variant={completedToday ? "outline" : "default"}
              disabled={Boolean(updatingDate)}
              onClick={() => void toggleDate(today)}
            >
              <Check className="size-4" />
              {completedToday ? t("actions.doneToday") : t("actions.markDone")}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs text-muted-foreground">
                {t("habits.currentStreak")}
              </p>
              <p className="mt-1 text-2xl font-bold">
                🔥 {habit.currentStreak}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs text-muted-foreground">
                {t("habits.bestStreak")}
              </p>
              <p className="mt-1 text-2xl font-bold">{analytics.bestStreak}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs text-muted-foreground">
                {t("habits.totalCheckIns")}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {analytics.totalCheckIns}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="size-4" /> {t("actions.edit")}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> {t("actions.delete")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("habits.activityLast30Days")}</CardTitle>
            <span className="text-sm font-semibold">
              {t("habits.monthlyRate", { rate: analytics.monthlyRate })}
            </span>
          </div>
          <Progress value={analytics.monthlyRate} />
        </CardHeader>
        <CardContent>
          <HabitActivityGrid
            habit={habit}
            updatingDate={updatingDate}
            onToggle={(date) => void toggleDate(date)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" /> {t("habits.checkInHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length ? (
            <div className="space-y-0">
              {history.map((log, index) => (
                <div key={log.id ?? log.date} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 size-2.5 rounded-full bg-emerald-500" />
                    {index < history.length - 1 && (
                      <span className="min-h-10 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-medium">
                      {new Intl.DateTimeFormat(language, {
                        dateStyle: "long",
                      }).format(parseDateKey(log.date))}
                    </p>
                    {log.createdAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(language, {
                          timeStyle: "short",
                        }).format(new Date(log.createdAt))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              <CalendarDays className="mb-2 size-5" />
              {t("habits.noCheckIns")}
            </div>
          )}
        </CardContent>
      </Card>

      <HabitFormDialog
        key={`${habit.id}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        goals={goals}
        habit={habit}
        onSaved={() => void loadData()}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={habit.title}
        description={t("actions.confirmDeleteHabit")}
        isDeleting={isDeleting}
        onConfirm={() => void deleteHabit()}
      />
    </div>
  );
}

export default function HabitDetailPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
    >
      <HabitDetailContent />
    </Suspense>
  );
}
