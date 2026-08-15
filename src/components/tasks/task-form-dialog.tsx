"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
import { useLanguage } from "@/components/providers/language-provider";
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
import { getLocalDateKey } from "@/lib/format";
import type { Goal, Priority, Task } from "@/lib/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
  task?: Task | null;
  defaultGoalId?: string;
  onTaskChanged: (task: Task) => void;
  onSaved: () => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  goals,
  task,
  defaultGoalId,
  onTaskChanged,
  onSaved,
}: TaskFormDialogProps) {
  const { t } = useLanguage();
  const [goalId, setGoalId] = useState(
    task?.goalId ?? defaultGoalId ?? "standalone",
  );
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "MEDIUM",
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate
      ? new Date(`${task.dueDate.slice(0, 10)}T00:00:00`)
      : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description") ?? ""),
      priority,
      dueDate: dueDate
        ? `${getLocalDateKey(dueDate)}T00:00:00.000Z`
        : null,
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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {task ? t("form.editTaskTitle") : t("form.createTaskTitle")}
          </DialogTitle>
          <DialogDescription>
            Keep it standalone or connect it to a goal for automatic progress.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-title">{t("form.title")}</Label>
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
            <Label htmlFor="task-description">{t("form.description")}</Label>
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
              <Label>{t("form.relatedGoal")}</Label>
              <Select value={goalId} onValueChange={(value) => setGoalId(String(value))}>
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {goalId === "standalone"
                      ? t("common.standalone")
                      : goals.find((goal) => goal.id === goalId)?.title ??
                        t("form.chooseGoal")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standalone">{t("common.standalone")}</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.priority")}</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {t(
                      priority === "LOW"
                        ? "priority.low"
                        : priority === "MEDIUM"
                          ? "priority.medium"
                          : "priority.high",
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t("priority.low")}</SelectItem>
                  <SelectItem value="MEDIUM">{t("priority.medium")}</SelectItem>
                  <SelectItem value="HIGH">{t("priority.high")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-date">{t("form.dueDate")}</Label>
            <DatePicker
              id="task-due-date"
              value={dueDate}
              onChange={setDueDate}
              placeholder={t("form.chooseDate")}
            />
          </div>
          {task && (
            <div className="rounded-lg border px-3 pb-3">
              <SubtaskChecklist
                task={task}
                onChange={onTaskChanged}
                onSettled={onSaved}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {task ? t("actions.saveChanges") : t("actions.createTask")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
