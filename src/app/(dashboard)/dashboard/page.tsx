"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { StreakBadge } from "@/components/habits/habit-badges";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { useLanguage } from "@/components/providers/language-provider";
import { EmptyState, LoadError } from "@/components/shared/async-state";
import { PageHeader } from "@/components/shared/page-header";
import { ViewAllLink } from "@/components/shared/view-all-link";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getApiError } from "@/lib/api";
import {
  celebrateHabitCompletion,
  celebrateNewlyCompletedGoals,
} from "@/lib/confetti";
import { formatDate, getLocalDateKey, isToday } from "@/lib/format";
import type { Category, Goal, Habit, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [goalsResponse, tasksResponse, habitsResponse, categoriesResponse] =
        await Promise.all([
          api.get<Goal[]>("/goals"),
          api.get<Task[]>("/tasks"),
          api.get<Habit[]>("/habits"),
          api.get<Category[]>("/categories"),
        ]);
      setGoals(goalsResponse.data);
      setTasks(tasksResponse.data);
      setHabits(habitsResponse.data);
      setCategories(categoriesResponse.data);
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const activeGoals = useMemo(
    () =>
      goals.filter(
        (goal) => goal.status === "IN_PROGRESS" || goal.status === "PLANNED",
      ),
    [goals],
  );
  const totalTasks = goals.reduce((sum, goal) => sum + goal.totalTasks, 0);
  const completedTasks = goals.reduce(
    (sum, goal) => sum + goal.completedTasks,
    0,
  );
  const overallCompletion = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const pendingToday = tasks.filter(
    (task) => !task.isCompleted && isToday(task.dueDate),
  );
  const quickTasks = pendingToday.length
    ? pendingToday.slice(0, 6)
    : tasks.filter((task) => !task.isCompleted).slice(0, 6);
  const todayKey = getLocalDateKey();
  const weekday = new Date().getDay();
  const todayHabits = habits.filter((habit) => {
    if (habit.frequency === "WEEKDAYS") return weekday >= 1 && weekday <= 5;
    if (habit.frequency === "WEEKENDS") return weekday === 0 || weekday === 6;
    return true;
  });

  async function toggleTask(task: Task, isCompleted: boolean) {
    if (updatingTaskId) return;
    setUpdatingTaskId(task.id);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, isCompleted } : item,
      ),
    );
    try {
      const previousGoals = goals;
      const { data: updatedTask } = await api.patch<Task>(`/tasks/${task.id}`, {
        isCompleted,
      });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updatedTask : item)),
      );
      const { data } = await api.get<Goal[]>("/goals");
      celebrateNewlyCompletedGoals(previousGoals, data);
      setGoals(data);
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, isCompleted: task.isCompleted }
            : item,
        ),
      );
      toast.error(getApiError(error));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function toggleHabit(habit: Habit) {
    if (updatingHabitId) return;
    setUpdatingHabitId(habit.id);
    const wasCompleted = habit.logs.some(
      (log) => log.date === todayKey && log.completed,
    );
    setHabits((current) =>
      current.map((item) =>
        item.id === habit.id
          ? {
              ...item,
              logs: wasCompleted
                ? item.logs.filter((log) => log.date !== todayKey)
                : [
                    ...item.logs,
                    { habitId: item.id, date: todayKey, completed: true },
                  ],
            }
          : item,
      ),
    );
    try {
      await api.post(`/habits/${habit.id}/toggle`, { date: todayKey });
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

  const summaryCards = [
    {
      label: t("dashboard.activeGoals"),
      value: activeGoals.length,
      hint: t("dashboard.totalGoals", { count: goals.length }),
      icon: Target,
    },
    {
      label: t("dashboard.overallCompletion"),
      value: `${overallCompletion}%`,
      hint: t("dashboard.linkedTasks", {
        completed: completedTasks,
        total: totalTasks,
      }),
      icon: TrendingUp,
    },
    {
      label: t("dashboard.pendingToday"),
      value: pendingToday.length,
      hint:
        pendingToday.length === 1
          ? t("dashboard.taskAttentionOne")
          : t("dashboard.taskAttentionOther"),
      icon: Clock3,
    },
  ];

  const createTaskButton = (
    <Button onClick={() => setTaskFormOpen(true)}>
      <Plus className="size-4" /> {t("actions.createTask")}
    </Button>
  );

  if (!isLoading && loadFailed) {
    return (
      <div className="flex flex-col space-y-6">
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.description")}
        />
        <LoadError onRetry={() => void loadData()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        action={createTaskButton}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent>
          <p className="text-base font-medium">
            {t("dashboard.greeting", {
              name: user?.name ?? "Plann",
              count: pendingToday.length,
              streak: user?.globalStreak ?? 0,
            })}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {isLoading ? <Skeleton className="h-9 w-16" /> : item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.currentLevel")}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {isLoading ? (
                    <Skeleton className="h-9 w-12" />
                  ) : (
                    user?.level ?? 1
                  )}
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Flame className="size-5" />
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("dashboard.xpTotal", { xp: user?.xp ?? 0 })}</span>
                <span>
                  {t("dashboard.toNext", { xp: user?.xpToNextLevel ?? 100 })}
                </span>
              </div>
              <Progress value={(user?.xp ?? 0) % 100} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.activeGoals")}</CardTitle>
            <CardDescription>{t("dashboard.outcomesInMotion")}</CardDescription>
            <CardAction>
              <ViewAllLink href="/goals" label={t("actions.viewAll")} />
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-36" />
                ))}
              </div>
            ) : activeGoals.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeGoals.slice(0, 4).map((goal) => (
                  <Link
                    href={`/goals/${goal.id}`}
                    key={goal.id}
                    className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card size="sm" className="h-full hover:bg-muted/40">
                      <CardContent>
                        <CategoryBadge category={goal.category} />
                        <CardTitle className="mt-3 line-clamp-1 text-base">
                          {goal.title}
                        </CardTitle>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {t("goals.tasksComplete", {
                                completed: goal.completedTasks,
                                total: goal.totalTasks,
                              })}
                            </span>
                            <span>{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title={t("dashboard.noActiveGoals")}
                className="min-h-56 border-0"
                action={
                  <Button
                    variant="outline"
                    onClick={() => setGoalFormOpen(true)}
                  >
                    <Plus /> {t("dashboard.createFirstGoal")}
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickChecklist")}</CardTitle>
            <CardDescription>
              {pendingToday.length
                ? t("dashboard.dueToday")
                : t("dashboard.nextOpenTasks")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-12" />
                ))}
              </div>
            ) : quickTasks.length ? (
              <FieldGroup className="gap-2">
                {quickTasks.map((task) => (
                  <FieldLabel key={task.id} className="cursor-pointer">
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={task.isCompleted}
                        disabled={Boolean(updatingTaskId)}
                        onCheckedChange={(checked) =>
                          void toggleTask(task, Boolean(checked))
                        }
                        aria-label={`${
                          task.isCompleted
                            ? t("actions.undo")
                            : t("actions.markTaskComplete")
                        }: ${task.title}`}
                      />
                      <FieldContent className="min-w-0">
                        <FieldTitle
                        className={cn(
                          "block truncate",
                          task.isCompleted && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                        </FieldTitle>
                        <FieldDescription>
                          {task.goal?.title ?? t("common.standalone")} ·{" "}
                          {formatDate(
                            task.dueDate,
                            language,
                            t("common.noDueDate"),
                          )}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </FieldGroup>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title={t("dashboard.allCaughtUp")}
                description={t("dashboard.readyForNextStep")}
                className="min-h-56 border-0"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.todaysHabits")}</CardTitle>
          <CardDescription>{t("dashboard.ritualsToday")}</CardDescription>
          <CardAction>
            <ViewAllLink href="/habits" label={t("actions.viewAll")} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-16" />
              ))}
            </div>
          ) : todayHabits.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayHabits.map((habit) => {
                const completedToday = habit.logs.some(
                  (log) => log.date === todayKey && log.completed,
                );
                return (
                  <Card key={habit.id} size="sm">
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Flame className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {habit.title}
                          </p>
                          <StreakBadge count={habit.currentStreak} />
                        </div>
                        <Button
                          size="icon-sm"
                          variant={completedToday ? "default" : "outline"}
                          disabled={Boolean(updatingHabitId)}
                          onClick={() => void toggleHabit(habit)}
                          aria-label={`${
                            completedToday
                              ? t("actions.undo")
                              : t("actions.markDone")
                          }: ${habit.title}`}
                        >
                          <Check className="size-4" />
                        </Button>
                      </div>
                      <MonthlyDots habit={habit} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Flame}
              title={t("dashboard.noHabitsToday")}
              className="min-h-32 border-0"
            />
          )}
        </CardContent>
      </Card>

      <GoalFormDialog
        key={`dashboard-goal-${goalFormOpen}`}
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        categories={categories}
        onSaved={() => void loadData()}
      />

      <TaskFormDialog
        key={`dashboard-task-${taskFormOpen}`}
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        goals={goals}
        onTaskChanged={(updatedTask) =>
          setTasks((current) =>
            current.map((task) =>
              task.id === updatedTask.id ? updatedTask : task,
            ),
          )
        }
        onSaved={() => void loadData()}
      />
    </div>
  );
}
