import { Suspense, useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Flame,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { useLanguage } from "@/components/providers/language-provider";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { celebrateGoalCompletion } from "@/lib/confetti";
import { formatDate } from "@/lib/format";
import type { Category, Goal, Habit } from "@/lib/types";
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
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

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

  async function deleteGoal() {
    if (!goal || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/goals/${goal.id}`);
      toast.success(t("toast.goalDeleted"));
      void refreshUser().catch(() => undefined);
      router.replace("/goals");
    } catch (error) {
      toast.error(getApiError(error));
      setIsDeleting(false);
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
      <nav
        className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link className="hover:text-foreground" href="/goals">
          {t("nav.goals")}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="max-w-64 truncate text-foreground">{goal.title}</span>
      </nav>

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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="size-4" /> {t("actions.editGoal")}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> {t("actions.deleteGoal")}
            </Button>
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
                {goal.tasks.map((task) => {
                  const subtasks = task.subtasks ?? [];
                  const completedSubtasks = subtasks.filter(
                    (subtask) => subtask.isCompleted,
                  ).length;
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${encodeURIComponent(task.id)}`}
                      className="block rounded-lg border p-3 transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium",
                            task.isCompleted &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {formatDate(
                            task.dueDate,
                            language,
                            t("common.noDueDate"),
                          )}
                        </span>
                        <span>
                          {t("tasks.subtasks", {
                            completed: completedSubtasks,
                            total: subtasks.length,
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
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
                {habits.map((habit) => (
                  <Link
                    key={habit.id}
                    href={`/habits/${encodeURIComponent(habit.id)}`}
                    className="block space-y-3 rounded-lg border p-3 transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    </div>
                    <MonthlyDots habit={habit} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("goals.noLinkedHabits")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <GoalFormDialog
        key={`goal-edit-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        goal={goal}
        onSaved={() => void loadData()}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("actions.deleteGoal")}
        description={t("actions.confirmDeleteGoal")}
        isDeleting={isDeleting}
        onConfirm={() => void deleteGoal()}
      />
      <TaskFormDialog
        key={`goal-task-${taskFormOpen}`}
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        goals={goals}
        defaultGoalId={goal.id}
        onTaskChanged={() => undefined}
        onSaved={() => void loadData()}
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
