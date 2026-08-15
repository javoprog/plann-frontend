"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, getApiError } from "@/lib/api";
import type { Goal, Priority, Task } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  task?: Task | null;
  onTaskChanged: (task: Task) => void;
  onSaved: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  goals,
  task,
  onTaskChanged,
  onSaved,
}: TaskFormDialogProps) {
  const [goalId, setGoalId] = useState(task?.goalId ?? "standalone");
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "MEDIUM",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const dueDate = String(formData.get("dueDate") ?? "");
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description") ?? ""),
      priority,
      dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      goalId: goalId === "standalone" ? null : goalId,
    };

    setIsSubmitting(true);
    try {
      if (task) {
        const { data } = await api.patch<Task>(`/tasks/${task.id}`, payload);
        onTaskChanged(data);
        toast.success("Task updated");
      } else {
        await api.post("/tasks", payload);
        toast.success("Task created");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "Create a new task"}</DialogTitle>
          <DialogDescription>
            Keep it standalone or connect it to a goal for automatic progress.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              defaultValue={task?.title ?? ""}
              placeholder="What needs to be done?"
              minLength={2}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Add any details that make the next step easier."
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Related goal</Label>
              <Select value={goalId} onValueChange={(value) => setGoalId(String(value))}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {goalId === "standalone"
                      ? "Standalone task"
                      : goals.find((goal) => goal.id === goalId)?.title ??
                        "Choose a goal"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">Standalone task</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due date</Label>
            <Input
              id="task-due-date"
              name="dueDate"
              type="date"
              defaultValue={task?.dueDate?.slice(0, 10) ?? ""}
            />
          </div>
          {task && (
            <div className="rounded-lg border px-3 pb-3">
              <SubtaskChecklist task={task} onChange={onTaskChanged} />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
