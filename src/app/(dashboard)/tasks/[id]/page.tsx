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
  ChevronRight,
  Circle,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { celebrateNewlyCompletedGoals } from "@/lib/confetti";
import { formatDate } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Goal, Task } from "@/lib/types";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)
  );
}

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const [task, setTask] = useState<Task | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [taskResponse, goalsResponse] = await Promise.all([
        api.get<Task>(`/tasks/${id}`),
        api.get<Goal[]>("/goals"),
      ]);
      setTask(taskResponse.data);
      setGoals(goalsResponse.data);
    } catch (error) {
      toast.error(getApiError(error));
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.code !== "Space" ||
        event.repeat ||
        !task ||
        isUpdating ||
        formOpen ||
        deleteOpen ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      void toggleTask(!task.isCompleted);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteOpen, formOpen, isUpdating, task, toggleTask]);

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
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  if (!task) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
        <Circle className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">{t("tasks.noTasks")}</p>
        <Link className="mt-3 text-sm hover:underline" href="/tasks">
          {t("actions.backToTasks")}
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
        <Link className="hover:text-foreground" href="/tasks">
          {t("nav.tasks")}
        </Link>
        <ChevronRight className="size-3.5" />
        {task.goal && (
          <>
            <Link
              className="max-w-48 truncate hover:text-foreground"
              href={`/goals/${encodeURIComponent(task.goal.id)}`}
            >
              {task.goal.title}
            </Link>
            <ChevronRight className="size-3.5" />
          </>
        )}
        <span className="max-w-64 truncate text-foreground">{task.title}</span>
      </nav>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <Badge
                  variant={task.isCompleted ? "default" : "secondary"}
                  className="capitalize"
                >
                  {task.isCompleted
                    ? t("common.completed")
                    : t("common.notCompleted")}
                </Badge>
                {task.goal && (
                  <Link href={`/goals/${encodeURIComponent(task.goal.id)}`}>
                    <Badge variant="outline" className="gap-1.5">
                      <Target className="size-3" />
                      {task.goal.title}
                    </Badge>
                  </Link>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {task.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              {formatDate(task.dueDate, language, t("common.noDueDate"))}
            </div>
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
        title={task.title}
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
      fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}
    >
      <TaskDetailContent />
    </Suspense>
  );
}
