"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckSquare2,
  Flame,
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
import {
  HabitFrequencyBadge,
  StreakBadge,
} from "@/components/habits/habit-badges";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { MonthlyDots } from "@/components/habits/monthly-dots";
import { useLanguage } from "@/components/providers/language-provider";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { DetailBreadcrumb } from "@/components/shared/detail-breadcrumb";
import { DetailMetaBadge } from "@/components/shared/detail-meta-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  EmptyState,
  LoadError,
  PageSkeleton,
} from "@/components/shared/async-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
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
    } catch {
      setLoadFailed(true);
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
    return <PageSkeleton variant="detail" />;
  }

  if (loadFailed) {
    return <LoadError onRetry={() => void loadData()} />;
  }

  if (!goal) {
    return (
      <EmptyState
        icon={Target}
        title={t("goals.noGoals")}
        action={<Button render={<Link href="/goals" />}>{t("actions.backToGoals")}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <DetailBreadcrumb
        root={{ href: "/goals", label: t("nav.goals") }}
        currentLabel={goal.title}
      />

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={goal.category} />
                <StatusBadge status={goal.status} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {goal.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {goal.description || t("common.noDescription")}
                </p>
              </div>
            </div>
            <DetailMetaBadge icon={CalendarDays}>
              <span>
                {t("goals.targetDeadline")}:{" "}
                {formatDate(goal.deadline, language, t("common.noDueDate"))}
              </span>
            </DetailMetaBadge>
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
              <Pencil className="size-4" /> {t("actions.edit")}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> {t("actions.delete")}
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
                className="min-w-48"
                disabled={isGeneratingAi}
                onClick={() => void generateAiPlan()}
              >
                {isGeneratingAi && <Spinner aria-label={t("common.loading")} />}
                {!isGeneratingAi && <Sparkles />}
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
          <CardHeader>
            <CardTitle>{t("goals.linkedTasks")}</CardTitle>
            <CardAction>
              <Button size="sm" onClick={() => setTaskFormOpen(true)}>
                <Plus className="size-4" /> {t("actions.addTask")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {goal.tasks?.length ? (
              <ItemGroup className="gap-2">
                {goal.tasks.map((task) => {
                  const subtasks = task.subtasks ?? [];
                  const completedSubtasks = subtasks.filter(
                    (subtask) => subtask.isCompleted,
                  ).length;
                  return (
                    <Item
                      key={task.id}
                      variant="outline"
                      className="items-start"
                      render={
                        <Link href={`/tasks/${encodeURIComponent(task.id)}`} />
                      }
                    >
                      <ItemContent>
                        <ItemTitle className="w-full flex-wrap">
                          <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm font-medium",
                            task.isCompleted &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                          </span>
                          <PriorityBadge priority={task.priority} />
                        </ItemTitle>
                        <ItemDescription className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  );
                })}
              </ItemGroup>
            ) : (
              <EmptyState
                icon={CheckSquare2}
                title={t("goals.noLinkedTasks")}
                className="min-h-40 border-0"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("goals.linkedHabits")}</CardTitle>
            <CardAction>
              <Button size="sm" onClick={() => setHabitFormOpen(true)}>
                <Plus className="size-4" /> {t("actions.addHabit")}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {habits.length ? (
              <ItemGroup className="gap-2">
                {habits.map((habit) => (
                  <Item
                    key={habit.id}
                    variant="outline"
                    className="items-start"
                    render={
                      <Link href={`/habits/${encodeURIComponent(habit.id)}`} />
                    }
                  >
                    <ItemMedia variant="icon">
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Flame className="size-4" />
                      </span>
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle>{habit.title}</ItemTitle>
                      <div className="flex flex-wrap gap-2">
                        <CategoryBadge category={habit.category} />
                        <HabitFrequencyBadge frequency={habit.frequency} />
                        <StreakBadge count={habit.currentStreak} />
                      </div>
                      <MonthlyDots habit={habit} />
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <EmptyState
                icon={Flame}
                title={t("goals.noLinkedHabits")}
                className="min-h-40 border-0"
              />
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
        title={t("actions.deleteNamed", { name: goal.title })}
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
      fallback={<PageSkeleton variant="detail" />}
    >
      <GoalPageContent />
    </Suspense>
  );
}
