"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
import { useLanguage } from "@/components/providers/language-provider";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, getApiError } from "@/lib/api";
import { getLocalDateKey } from "@/lib/format";
import type { Goal, Priority, RecurrenceInterval, Task } from "@/lib/types";

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
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [goalId, setGoalId] = useState(
    task?.goalId ?? defaultGoalId ?? "standalone",
  );
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "MEDIUM",
  );
  const [isRecurring, setIsRecurring] = useState(task?.isRecurring ?? false);
  const [recurrenceInterval, setRecurrenceInterval] =
    useState<RecurrenceInterval>(task?.recurrenceInterval ?? "DAILY");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate
      ? new Date(`${task.dueDate.slice(0, 10)}T00:00:00`)
      : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      title,
      description,
      priority,
      isRecurring,
      recurrenceInterval: isRecurring ? recurrenceInterval : null,
      dueDate: dueDate ? `${getLocalDateKey(dueDate)}T00:00:00.000Z` : null,
      goalId: goalId === "standalone" ? null : goalId,
    };

    setIsSubmitting(true);
    try {
      if (task) {
        const { data } = await api.patch<Task>(`/tasks/${task.id}`, payload);
        onTaskChanged(data);
        toast.success(t("toast.taskUpdated"));
      } else {
        await api.post("/tasks", payload);
        toast.success(t("toast.taskCreated"));
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
          <DialogTitle>
            {task ? t("form.editTaskTitle") : t("form.createTaskTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.taskDescriptionText")}</DialogDescription>
        </DialogHeader>
        <form className="min-h-0" onSubmit={handleSubmit}>
          <ScrollArea className="-mx-1 max-h-[60svh] px-1">
            <FieldGroup className="py-1 pr-3">
              <Field>
                <FieldLabel htmlFor="task-title">{t("form.title")}</FieldLabel>
                <Input
                  id="task-title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("form.taskTitlePlaceholder")}
                  minLength={2}
                  maxLength={200}
                  required
                />
              </Field>
              <FieldGroup className="gap-3 rounded-lg border p-3">
                <Field orientation="horizontal" className="items-center gap-2">
                  <Checkbox
                    id="task-recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      const nextIsRecurring = Boolean(checked);
                      setIsRecurring(nextIsRecurring);
                      if (nextIsRecurring && !dueDate) setDueDate(new Date());
                    }}
                  />
                  <FieldLabel htmlFor="task-recurring">
                    {t("form.isRecurring")}
                  </FieldLabel>
                </Field>
                {isRecurring && (
                  <Field>
                    <FieldLabel htmlFor="task-recurrence">
                      {t("form.recurrenceInterval")}
                    </FieldLabel>
                    <Select
                      value={recurrenceInterval}
                      onValueChange={(value) =>
                        setRecurrenceInterval(value as RecurrenceInterval)
                      }
                    >
                      <SelectTrigger id="task-recurrence" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">
                          {t("recurrence.daily")}
                        </SelectItem>
                        <SelectItem value="WEEKLY">
                          {t("recurrence.weekly")}
                        </SelectItem>
                        <SelectItem value="MONTHLY">
                          {t("recurrence.monthly")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="task-description">
                  {t("form.description")}
                </FieldLabel>
                <Textarea
                  id="task-description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("form.taskDescriptionPlaceholder")}
                  rows={3}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="task-goal">
                    {t("form.relatedGoal")}
                  </FieldLabel>
                  <Select
                    value={goalId}
                    onValueChange={(value) => setGoalId(String(value))}
                  >
                    <SelectTrigger id="task-goal" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">
                        {t("common.standalone")}
                      </SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-priority">
                    {t("form.priority")}
                  </FieldLabel>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as Priority)}
                  >
                    <SelectTrigger id="task-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{t("priority.low")}</SelectItem>
                      <SelectItem value="MEDIUM">
                        {t("priority.medium")}
                      </SelectItem>
                      <SelectItem value="HIGH">{t("priority.high")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="task-due-date">
                  {t("form.dueDate")}
                </FieldLabel>
                <DatePicker
                  id="task-due-date"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder={t("form.chooseDate")}
                />
              </Field>
              {task && (
                <SubtaskChecklist
                  task={task}
                  onChange={onTaskChanged}
                  onSettled={onSaved}
                />
              )}
            </FieldGroup>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner aria-label={t("common.loading")} />}
              {task ? t("actions.saveChanges") : t("actions.createTask")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
