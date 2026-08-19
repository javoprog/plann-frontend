"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { DetailBreadcrumb } from "@/components/shared/detail-breadcrumb";
import { DetailMetaBadge } from "@/components/shared/detail-meta-badge";
import { GoalLinkBadge } from "@/components/shared/goal-link-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  EmptyState,
  LoadError,
  PageSkeleton,
} from "@/components/shared/async-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { celebrateNewlyCompletedGoals } from "@/lib/confetti";
import { formatDate } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Goal, Task } from "@/lib/types";

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [task, setTask] = useState<Task | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [taskResponse, goalsResponse] = await Promise.all([
        api.get<Task>(`/tasks/${id}`),
        api.get<Goal[]>("/goals"),
      ]);
      setTask(taskResponse.data);
      setGoals(goalsResponse.data);
    } catch {
      setLoadFailed(true);
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const toggleTask = useCallback(
    async (isCompleted: boolean) => {
      if (!task || isUpdating) return;
      const previousTask = task;
      const previousGoals = goals;
      setTask(withTaskCompletion(task, isCompleted));
      setIsUpdating(true);
      try {
        const { data } = await api.patch<Task>(`/tasks/${task.id}`, {
          isCompleted,
        });
        setTask(data);
        const { data: nextGoals } = await api.get<Goal[]>("/goals");
        setGoals(nextGoals);
        celebrateNewlyCompletedGoals(previousGoals, nextGoals);
        void refreshUser().catch((error: unknown) =>
          toast.error(getApiError(error)),
        );
      } catch (error) {
        setTask(previousTask);
        toast.error(getApiError(error));
      } finally {
        setIsUpdating(false);
      }
    },
    [goals, isUpdating, refreshUser, task],
  );

  const subtaskStats = useMemo(() => {
    const subtasks = task?.subtasks ?? [];
    const completed = subtasks.filter((subtask) => subtask.isCompleted).length;
    const percent = subtasks.length
      ? Math.round((completed / subtasks.length) * 100)
      : 0;
    return { completed, total: subtasks.length, percent };
  }, [task?.subtasks]);

  async function deleteTask() {
    if (!task || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success(t("toast.taskDeleted"));
      void refreshUser().catch(() => undefined);
      router.replace("/tasks");
    } catch (error) {
      toast.error(getApiError(error));
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (loadFailed) {
    return <LoadError onRetry={() => void loadData()} />;
  }

  if (!task) {
    return (
      <EmptyState
        icon={Circle}
        title={t("tasks.noTasks")}
        action={<Button render={<Link href="/tasks" />}>{t("actions.backToTasks")}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <DetailBreadcrumb
        root={{ href: "/tasks", label: t("nav.tasks") }}
        parent={
          task.goal
            ? {
                href: `/goals/${encodeURIComponent(task.goal.id)}`,
                label: task.goal.title,
              }
            : undefined
        }
        currentLabel={task.title}
      />

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <Badge
                  variant={task.isCompleted ? "default" : "secondary"}
                >
                  {task.isCompleted
                    ? t("common.completed")
                    : t("common.notCompleted")}
                </Badge>
                {task.goal && (
                  <GoalLinkBadge goal={task.goal} />
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {task.title}
              </h1>
            </div>
            <DetailMetaBadge icon={CalendarDays}>
              <span>
                {t("form.dueDate")}: {formatDate(
                  task.dueDate,
                  language,
                  t("common.noDueDate"),
                )}
              </span>
            </DetailMetaBadge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isUpdating}
              variant={task.isCompleted ? "outline" : "default"}
              onClick={() => void toggleTask(!task.isCompleted)}
            >
              {task.isCompleted ? (
                <Circle className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {task.isCompleted
                ? t("actions.markTaskIncomplete")
                : t("actions.markTaskComplete")}
            </Button>
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
        <CardHeader>
          <CardTitle>{t("form.description")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {task.description || t("common.noDescription")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{t("tasks.subtasksWorkspace")}</CardTitle>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("tasks.subtaskProgress", subtaskStats)}
              </span>
              <span className="font-semibold">{subtaskStats.percent}%</span>
            </div>
            <Progress value={subtaskStats.percent} />
          </div>
        </CardHeader>
        <CardContent>
          <SubtaskChecklist
            task={task}
            onChange={setTask}
            onSettled={() =>
              void refreshUser().catch((error: unknown) =>
                toast.error(getApiError(error)),
              )
            }
          />
        </CardContent>
      </Card>

      <TaskFormDialog
        key={`${task.id}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        goals={goals}
        task={task}
        onTaskChanged={setTask}
        onSaved={() => void loadData()}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("actions.deleteNamed", { name: task.title })}
        description={t("actions.confirmDeleteTask")}
        isDeleting={isDeleting}
        onConfirm={() => void deleteTask()}
      />
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={<PageSkeleton variant="detail" />}
    >
      <TaskDetailContent />
    </Suspense>
  );
}
