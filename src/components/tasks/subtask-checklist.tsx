"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api, getApiError } from "@/lib/api";
import type { Subtask } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SubtaskChecklistProps {
  taskId: string;
  subtasks?: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export function SubtaskChecklist({
  taskId,
  subtasks = [],
  onChange,
}: SubtaskChecklistProps) {
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;

  async function addSubtask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) return;

    setIsAdding(true);
    try {
      const { data } = await api.post<Subtask>(`/tasks/${taskId}/subtasks`, {
        title: trimmedTitle,
      });
      onChange([...subtasks, data]);
      setTitle("");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleSubtask(subtask: Subtask, isCompleted: boolean) {
    const optimistic = subtasks.map((item) =>
      item.id === subtask.id ? { ...item, isCompleted } : item,
    );
    onChange(optimistic);
    try {
      await api.patch(`/subtasks/${subtask.id}`, { isCompleted });
    } catch (error) {
      onChange(subtasks);
      toast.error(getApiError(error));
    }
  }

  async function deleteSubtask(subtask: Subtask) {
    onChange(subtasks.filter((item) => item.id !== subtask.id));
    try {
      await api.delete(`/subtasks/${subtask.id}`);
    } catch (error) {
      onChange(subtasks);
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {completed}/{subtasks.length} subtasks
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
      <form className="flex gap-2" onSubmit={addSubtask}>
        <Input
          className="h-8 text-xs"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a subtask"
          maxLength={200}
          aria-label="New subtask title"
        />
        <Button
          type="submit"
          size="icon-sm"
          variant="outline"
          disabled={!title.trim() || isAdding}
          aria-label="Add subtask"
        >
          <Plus className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
