"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { formatDate, getLocalDateKey, isToday } from "@/lib/format";
import type { Goal, Habit, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsResponse, tasksResponse, habitsResponse] = await Promise.all([
        api.get<Goal[]>("/goals"),
        api.get<Task[]>("/tasks"),
        api.get<Habit[]>("/habits"),
      ]);
      setGoals(goalsResponse.data);
      setTasks(tasksResponse.data);
      setHabits(habitsResponse.data);
    } catch (error) {
      toast.error(getApiError(error));
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
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, isCompleted } : item,
      ),
    );
    try {
      await api.patch(`/tasks/${task.id}`, { isCompleted });
      const { data } = await api.get<Goal[]>("/goals");
      setGoals(data);
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, isCompleted: task.isCompleted }
            : item,
        ),
      );
      toast.error(getApiError(error));
    }
  }

  async function toggleHabit(habit: Habit) {
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
    } catch (error) {
      setHabits((current) =>
        current.map((item) => (item.id === habit.id ? habit : item)),
      );
      toast.error(getApiError(error));
    }
  }

  const summaryCards = [
    {
      label: "Active goals",
      value: activeGoals.length,
      hint: `${goals.length} total goals`,
      icon: Target,
    },
    {
      label: "Overall completion",
      value: `${overallCompletion}%`,
      hint: `${completedTasks} of ${totalTasks} linked tasks`,
      icon: TrendingUp,
    },
    {
      label: "Pending today",
      value: pendingToday.length,
      hint: pendingToday.length === 1 ? "task needs attention" : "tasks need attention",
      icon: Clock3,
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            A focused view of what is moving and what needs your attention.
          </p>
        </div>
        <div>
          <Link href="/tasks?create=true" className={buttonVariants()}>
            <Plus className="size-4" /> New Task
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {isLoading ? "—" : item.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Active goals</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The outcomes currently in motion.
              </p>
            </div>
            <Link
              href="/goals"
              className="flex items-center gap-1 text-sm font-medium hover:underline"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : activeGoals.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeGoals.slice(0, 4).map((goal) => (
                  <Link
                    href="/goals"
                    key={goal.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <CategoryBadge category={goal.category} />
                    <h3 className="mt-3 line-clamp-1 font-semibold">{goal.title}</h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{goal.completedTasks}/{goal.totalTasks} tasks</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                <Target className="size-7 text-muted-foreground" />
                <p className="mt-3 font-medium">No active goals yet</p>
                <Link className="mt-2 text-sm text-muted-foreground hover:underline" href="/goals?create=true">
                  Create your first goal
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick task checklist</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pendingToday.length ? "Due today" : "Your next open tasks"}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : quickTasks.length ? (
              <div className="space-y-2">
                {quickTasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={task.isCompleted}
                      onCheckedChange={(checked) =>
                        void toggleTask(task, Boolean(checked))
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          task.isCompleted && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {task.goal?.title ?? "Standalone"} · {formatDate(task.dueDate)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="mt-3 font-medium">You are all caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a task when you are ready for the next step.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Today&apos;s habits</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Small rituals scheduled for today.
            </p>
          </div>
          <Link
            href="/habits"
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : todayHabits.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayHabits.map((habit) => {
                const completedToday = habit.logs.some(
                  (log) => log.date === todayKey && log.completed,
                );
                return (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                      <Flame className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{habit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {habit.currentStreak} day streak
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant={completedToday ? "default" : "outline"}
                      onClick={() => void toggleHabit(habit)}
                      aria-label={`${completedToday ? "Undo" : "Complete"} ${habit.title}`}
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No habits are scheduled today.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
