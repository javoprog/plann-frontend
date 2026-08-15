"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api, getApiError } from "@/lib/api";
import {
  withAddedSubtask,
  withoutSubtask,
  withSubtaskCompletion,
} from "@/lib/task-completion";
import type { Subtask, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SubtaskChecklistProps {
  task: Task;
  onChange: (task: Task) => void;
  onSettled?: (updatedTask: Task, previousTask: Task) => void;
}

export function SubtaskChecklist({
  task,
  onChange,
  onSettled,
}: SubtaskChecklistProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const subtasks = task.subtasks ?? [];
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;

  async function addSubtask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) return;

    const now = new Date().toISOString();
    const optimisticSubtask: Subtask = {
      id: `optimistic-${Date.now()}`,
      title: trimmedTitle,
      isCompleted: false,
      taskId: task.id,
      createdAt: now,
      updatedAt: now,
    };
    onChange(withAddedSubtask(task, optimisticSubtask));
    setIsAdding(true);
    try {
      const { data } = await api.post<Task>(`/tasks/${task.id}/subtasks`, {
        title: trimmedTitle,
      });
      onChange(data);
      setTitle("");
      onSettled?.(data, task);
    } catch (error) {
      onChange(task);
      toast.error(getApiError(error));
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleSubtask(subtask: Subtask, isCompleted: boolean) {
    onChange(withSubtaskCompletion(task, subtask.id, isCompleted));
    try {
      const { data } = await api.patch<Task>(`/subtasks/${subtask.id}`, {
        isCompleted,
      });
      onChange(data);
      onSettled?.(data, task);
    } catch (error) {
      onChange(task);
      toast.error(getApiError(error));
    }
  }

  async function deleteSubtask(subtask: Subtask) {
    onChange(withoutSubtask(task, subtask.id));
    try {
      const { data } = await api.delete<Task>(`/subtasks/${subtask.id}`);
      onChange(data);
      onSettled?.(data, task);
    } catch (error) {
      onChange(task);
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {t("tasks.subtasks", { completed, total: subtasks.length })}
      </p>
      {subtasks.length > 0 && (
        <div className="mb-2 space-y-1">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 py-1">
              <Checkbox
                checked={subtask.isCompleted}
                onCheckedChange={(checked) =>
                  void toggleSubtask(subtask, Boolean(checked))
                }
                aria-label={`Mark ${subtask.title} complete`}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs",
                  subtask.isCompleted &&
                    "text-muted-foreground line-through",
                )}
              >
                {subtask.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Delete ${subtask.title}`}
                onClick={() => void deleteSubtask(subtask)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          className="h-8 text-xs"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("tasks.addSubtask")}
          maxLength={200}
          aria-label="New subtask title"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void addSubtask();
            }
          }}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={!title.trim() || isAdding}
          aria-label="Add subtask"
          onClick={() => void addSubtask()}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
