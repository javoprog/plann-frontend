"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Flame,
  Loader2,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { useLanguage } from "@/components/providers/language-provider";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import {
  celebrateGoalCompletion,
  celebrateHabitCompletion,
} from "@/lib/confetti";
import { formatDate, getLocalDateKey } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Category, Goal, Habit, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type AiPlanGenerationResponse =
  | { status: "INSUFFICIENT_DATA"; message: string }
  | {
      status: "SUCCESS";
      createdTasksCount: number;
      createdHabitsCount: number;
    };

function GoalPageContent() {
  const { id } = useParams<{ id: string }>();
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const today = getLocalDateKey();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalResponse, habitsResponse, categoriesResponse, goalsResponse] =
        await Promise.all([
          api.get<Goal>(`/goals/${id}`),
          api.get<Habit[]>("/habits"),
          api.get<Category[]>("/categories"),
          api.get<Goal[]>("/goals"),
        ]);
      setGoal(goalResponse.data);
      setHabits(habitsResponse.data.filter((habit) => habit.goalId === id));
      setCategories(categoriesResponse.data);
      setGoals(goalsResponse.data);
    } catch (error) {
      toast.error(getApiError(error));
      setGoal(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  function updateTask(updatedTask: Task) {
    setGoal((current) => {
      if (!current?.tasks) return current;
      const tasks = current.tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      const completedTasks = tasks.filter((task) => task.isCompleted).length;
      return {
        ...current,
        tasks,
        completedTasks,
        totalTasks: tasks.length,
        progress: tasks.length
          ? Math.round((completedTasks / tasks.length) * 100)
          : 0,
      };
    });
  }

  async function refreshGoal(previousProgress?: number) {
    const { data } = await api.get<Goal>(`/goals/${id}`);
    if (
      previousProgress !== undefined &&
      previousProgress < 100 &&
      data.progress === 100
    ) {
      celebrateGoalCompletion();
    }
    setGoal(data);
    void refreshUser().catch((error: unknown) =>
      toast.error(getApiError(error)),
    );
  }

  async function toggleTask(task: Task, isCompleted: boolean) {
    const previousProgress = goal?.progress ?? 0;
    updateTask(withTaskCompletion(task, isCompleted));
    try {
      const { data } = await api.patch<Task>(`/tasks/${task.id}`, {
        isCompleted,
      });
      updateTask(data);
      await refreshGoal(previousProgress);
    } catch (error) {
      updateTask(task);
      toast.error(getApiError(error));
    }
  }

  async function toggleHabit(habit: Habit) {
    const wasCompleted = habit.logs.some(
      (log) => log.date === today && log.completed,
    );
    try {
      await api.post(`/habits/${habit.id}/toggle`, { date: today });
      const { data } = await api.get<Habit[]>("/habits");
      setHabits(data.filter((item) => item.goalId === id));
      if (!wasCompleted) celebrateHabitCompletion();
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function generateAiPlan() {
    if (isGeneratingAi) return;
    setIsGeneratingAi(true);
    try {
      const { data } = await api.post<AiPlanGenerationResponse>(
        `/goals/${id}/generate-ai-plan`,
      );
      if (data.status === "INSUFFICIENT_DATA") {
        toast.error(t("ai.insufficientData"));
        return;
      }

      celebrateGoalCompletion();
      await loadData();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        toast.error(t("ai.temporarilyUnavailable"));
      } else {
        toast.error(getApiError(error));
      }
    } finally {
      setIsGeneratingAi(false);
    }
  }

  const isGoalEmpty = (goal?.tasks?.length ?? 0) === 0 && habits.length === 0;

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  if (!goal) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
        <Target className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">{t("goals.noGoals")}</p>
        <Link className="mt-3 text-sm hover:underline" href="/goals">
          {t("actions.backToGoals")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <Link
        href="/goals"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("actions.backToGoals")}
      </Link>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={goal.category} />
                <StatusBadge status={goal.status} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {goal.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {goal.description || t("common.noDescription")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>
                {t("goals.targetDeadline")}:{" "}
                {formatDate(goal.deadline, language, t("common.noDueDate"))}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("goals.progress")}</span>
              <span className="text-lg font-bold">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {t("goals.tasksComplete", {
                completed: goal.completedTasks,
                total: goal.totalTasks,
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {isGoalEmpty && (
        <Card className="border-dashed">
          <CardContent className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-7" />
            </span>
            <h2 className="mt-5 text-xl font-bold tracking-tight">
              {t("ai.emptyTitle")}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {t("ai.emptySubtitle")}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                className={cn(
                  "min-w-48",
                  isGeneratingAi && "animate-pulse shadow-lg shadow-primary/30",
                )}
                disabled={isGeneratingAi}
                onClick={() => void generateAiPlan()}
              >
                {isGeneratingAi && <Loader2 className="size-4 animate-spin" />}
                {isGeneratingAi ? t("ai.generating") : t("generatePlan")}
              </Button>
              <Button
                variant="outline"
                disabled={isGeneratingAi}
                onClick={() => setTaskFormOpen(true)}
              >
                {t("actions.addTaskManually")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={cn("grid gap-6 xl:grid-cols-2", isGoalEmpty && "hidden")}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>{t("goals.linkedTasks")}</CardTitle>
            <Button size="sm" onClick={() => setTaskFormOpen(true)}>
              <Plus className="size-4" /> {t("actions.addTask")}
            </Button>
          </CardHeader>
          <CardContent>
            {goal.tasks?.length ? (
              <div className="space-y-3">
                {goal.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-0.5"
                        checked={task.isCompleted}
                        onCheckedChange={(checked) =>
                          void toggleTask(task, Boolean(checked))
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              task.isCompleted &&
                                "text-muted-foreground line-through",
                            )}
                          >
                            {task.title}
                          </p>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(
                            task.dueDate,
                            language,
                            t("common.noDueDate"),
                          )}
                        </p>
                        <SubtaskChecklist
                          task={task}
                          onChange={updateTask}
                          onSettled={(_updatedTask, previousTask) =>
                            void refreshGoal(
                              previousTask.isCompleted ? 100 : goal.progress,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("goals.noLinkedTasks")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>{t("goals.linkedHabits")}</CardTitle>
            <Button size="sm" onClick={() => setHabitFormOpen(true)}>
              <Plus className="size-4" /> {t("actions.addHabit")}
            </Button>
          </CardHeader>
          <CardContent>
            {habits.length ? (
              <div className="space-y-3">
                {habits.map((habit) => {
                  const completedToday = habit.logs.some(
                    (log) => log.date === today && log.completed,
                  );
                  return (
                    <div
                      key={habit.id}
                      className="space-y-3 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                          <Flame className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {habit.title}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <CategoryBadge category={habit.category} />
                            <Badge variant="secondary">
                              {t("common.dayStreak", {
                                count: habit.currentStreak,
                              })}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="icon-sm"
                          variant={completedToday ? "default" : "outline"}
                          onClick={() => void toggleHabit(habit)}
                          aria-label={
                            completedToday
                              ? t("actions.doneToday")
                              : t("actions.markDone")
                          }
                        >
                          <Check className="size-4" />
                        </Button>
                      </div>
                      <MonthlyDots habit={habit} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("goals.noLinkedHabits")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        key={`goal-task-${taskFormOpen}`}
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        goals={goals}
        defaultGoalId={goal.id}
        onTaskChanged={updateTask}
        onSaved={() => void refreshGoal(goal.progress)}
      />
      <HabitFormDialog
        key={`goal-habit-${habitFormOpen}`}
        open={habitFormOpen}
        onOpenChange={setHabitFormOpen}
        categories={categories}
        goals={goals}
        defaultGoalId={goal.id}
        onSaved={() => void loadData()}
      />
    </div>
  );
}

export default function GoalPage() {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
    >
      <GoalPageContent />
    </Suspense>
  );
}
