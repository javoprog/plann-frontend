"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
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
  withSubtaskTitle,
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
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const subtasks = task.subtasks ?? [];
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;

  useEffect(() => {
    if (isAddFormOpen) addInputRef.current?.focus();
  }, [isAddFormOpen]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  async function addSubtask() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) return;

    const previousTask = task;
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
      setIsAddFormOpen(false);
      onSettled?.(data, previousTask);
    } catch (error) {
      onChange(previousTask);
      toast.error(getApiError(error));
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleSubtask(subtask: Subtask, isCompleted: boolean) {
    const previousTask = task;
    onChange(withSubtaskCompletion(task, subtask.id, isCompleted));
    try {
      const { data } = await api.patch<Task>(`/subtasks/${subtask.id}`, {
        isCompleted,
      });
      onChange(data);
      onSettled?.(data, previousTask);
    } catch (error) {
      onChange(previousTask);
      toast.error(getApiError(error));
    }
  }

  function startEditing(subtask: Subtask) {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function saveSubtaskTitle(subtask: Subtask) {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle || isSavingEdit) return;

    const previousTask = task;
    onChange(withSubtaskTitle(task, subtask.id, trimmedTitle));
    setIsSavingEdit(true);
    try {
      const { data } = await api.patch<Task>(`/subtasks/${subtask.id}`, {
        title: trimmedTitle,
      });
      onChange(data);
      cancelEditing();
      onSettled?.(data, previousTask);
    } catch (error) {
      onChange(previousTask);
      toast.error(getApiError(error));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteSubtask(subtask: Subtask) {
    const previousTask = task;
    onChange(withoutSubtask(task, subtask.id));
    try {
      const { data } = await api.delete<Task>(`/subtasks/${subtask.id}`);
      onChange(data);
      onSettled?.(data, previousTask);
    } catch (error) {
      onChange(previousTask);
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
                disabled={editingId === subtask.id}
                onCheckedChange={(checked) =>
                  void toggleSubtask(subtask, Boolean(checked))
                }
                aria-label={subtask.title}
              />
              {editingId === subtask.id ? (
                <>
                  <Input
                    ref={editInputRef}
                    className="h-8 min-w-0 flex-1 text-xs"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    maxLength={200}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void saveSubtaskTitle(subtask);
                      }
                      if (event.key === "Escape") cancelEditing();
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={!editingTitle.trim() || isSavingEdit}
                    aria-label={t("actions.saveChanges")}
                    onClick={() => void saveSubtaskTitle(subtask)}
                  >
                    <Check className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={isSavingEdit}
                    aria-label={t("actions.cancel")}
                    onClick={cancelEditing}
                  >
                    <X className="size-3" />
                  </Button>
                </>
              ) : (
                <>
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
                    aria-label={t("actions.edit")}
                    onClick={() => startEditing(subtask)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("actions.delete")}
                    onClick={() => void deleteSubtask(subtask)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {isAddFormOpen ? (
        <div className="flex gap-2">
          <Input
            ref={addInputRef}
            className="h-8 text-xs"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("tasks.addSubtask")}
            maxLength={200}
            aria-label={t("tasks.addSubtask")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addSubtask();
              }
              if (event.key === "Escape") {
                setTitle("");
                setIsAddFormOpen(false);
              }
            }}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!title.trim() || isAdding}
            aria-label={t("tasks.addSubtask")}
            onClick={() => void addSubtask()}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isAdding}
            aria-label={t("actions.cancel")}
            onClick={() => {
              setTitle("");
              setIsAddFormOpen(false);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsAddFormOpen(true)}
        >
          <Plus className="size-3.5" />
          {t("tasks.addSubtask")}
        </Button>
      )}
    </div>
  );
}
