"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { celebrateGoalCompletion } from "@/lib/confetti";
import { formatDate } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Goal, Task } from "@/lib/types";

interface GoalDetailDialogProps {
  goalId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function GoalDetailDialog({
  goalId,
  onOpenChange,
  onChanged,
}: GoalDetailDialogProps) {
  const { refreshUser } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadGoal = useCallback(async () => {
    if (!goalId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get<Goal>(`/goals/${goalId}`);
      setGoal(data);
    } catch (error) {
      toast.error(getApiError(error));
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [goalId, onOpenChange]);

  useEffect(() => {
    queueMicrotask(() => void loadGoal());
  }, [loadGoal]);

  async function toggleTask(task: Task, isCompleted: boolean) {
    updateTask(withTaskCompletion(task, isCompleted));
    try {
      const { data } = await api.patch<Task>(`/tasks/${task.id}`, {
        isCompleted,
      });
      handleTaskSettled(data, task);
    } catch (error) {
      updateTask(task);
      toast.error(getApiError(error));
    }
  }

  function updateTask(updatedTask: Task) {
    setGoal((current) => {
      if (!current?.tasks) return current;
      const tasks = current.tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      const completedTasks = tasks.filter((task) => task.isCompleted).length;
      const totalTasks = tasks.length;
      return {
        ...current,
        tasks,
        completedTasks,
        totalTasks,
        progress: totalTasks
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
      };
    });
  }

  function getProgress(tasks: Task[]) {
    if (!tasks.length) return 0;
    return Math.round(
      (tasks.filter((task) => task.isCompleted).length / tasks.length) * 100,
    );
  }

  function handleTaskSettled(updatedTask: Task, previousTask: Task) {
    const currentTasks = goal?.tasks ?? [];
    const beforeTasks = currentTasks.map((task) =>
      task.id === previousTask.id ? previousTask : task,
    );
    const afterTasks = currentTasks.map((task) =>
      task.id === updatedTask.id ? updatedTask : task,
    );
    if (getProgress(beforeTasks) < 100 && getProgress(afterTasks) === 100) {
      celebrateGoalCompletion();
    }
    updateTask(updatedTask);
    void refreshUser().catch((error: unknown) =>
      toast.error(getApiError(error)),
    );
    onChanged();
  }

  return (
    <Dialog open={Boolean(goalId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {isLoading && !goal ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading goal…
          </div>
        ) : goal ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <CategoryBadge category={goal.category} />
                <StatusBadge status={goal.status} />
              </div>
              <DialogTitle className="text-xl">{goal.title}</DialogTitle>
              <DialogDescription>
                {goal.description || "No description added yet."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {goal.completedTasks} of {goal.totalTasks} tasks complete
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" /> {formatDate(goal.deadline)}
                </span>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">Linked tasks</h3>
              <div className="space-y-2">
                {goal.tasks?.length ? (
                  goal.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border p-3"
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={(checked) =>
                            void toggleTask(task, Boolean(checked))
                          }
                        />
                        <span
                          className={
                            task.isCompleted
                              ? "flex-1 text-sm text-muted-foreground line-through"
                              : "flex-1 text-sm font-medium"
                          }
                        >
                          {task.title}
                        </span>
                        {task.isCompleted ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <Circle className="size-4 text-muted-foreground" />
                        )}
                      </label>
                      <SubtaskChecklist
                        task={task}
                        onChange={updateTask}
                        onSettled={handleTaskSettled}
                      />
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    No tasks are linked to this goal yet.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
