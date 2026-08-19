"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
import { useLanguage } from "@/components/providers/language-provider";
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
import type { Category, Goal, GoalStatus } from "@/lib/types";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  goal?: Goal | null;
  onSaved: () => void;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  categories,
  goal,
  onSaved,
}: GoalFormDialogProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [categoryId, setCategoryId] = useState(goal?.categoryId ?? "none");
  const [status, setStatus] = useState<GoalStatus>(
    goal?.status ?? "IN_PROGRESS",
  );
  const [deadline, setDeadline] = useState<Date | undefined>(
    goal?.deadline
      ? new Date(`${goal.deadline.slice(0, 10)}T00:00:00`)
      : undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? "");
    setDescription(goal?.description ?? "");
    setCategoryId(goal?.categoryId ?? "none");
    setStatus(goal?.status ?? "IN_PROGRESS");
    setDeadline(
      goal?.deadline
        ? new Date(`${goal.deadline.slice(0, 10)}T00:00:00`)
        : undefined,
    );
  }, [goal, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      title,
      description,
      deadline: deadline
        ? `${getLocalDateKey(deadline)}T00:00:00.000Z`
        : null,
      categoryId: categoryId === "none" ? null : categoryId,
      status,
    };

    setIsSubmitting(true);
    try {
      if (goal) {
        await api.patch(`/goals/${goal.id}`, payload);
        toast.success(t("toast.goalUpdated"));
      } else {
        await api.post("/goals", payload);
        toast.success(t("toast.goalCreated"));
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
            {goal ? t("form.editGoalTitle") : t("form.createGoalTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.goalDescriptionText")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="goal-title">{t("form.title")}</Label>
            <Input
              id="goal-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("form.goalTitlePlaceholder")}
              minLength={2}
              maxLength={160}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-description">{t("form.description")}</Label>
            <Textarea
              id="goal-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("form.goalDescriptionPlaceholder")}
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.category")}</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(String(value))}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {categoryId === "none"
                      ? t("common.noCategory")
                      : categories.find((category) => category.id === categoryId)
                          ?.name ?? t("form.chooseCategory")}
                  </span>
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="none">{t("common.noCategory")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.status")}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as GoalStatus)}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {t(
                      status === "PLANNED"
                        ? "status.planned"
                        : status === "IN_PROGRESS"
                          ? "status.inProgress"
                          : status === "COMPLETED"
                            ? "status.completed"
                            : "status.cancelled",
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">{t("status.planned")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">{t("form.deadline")}</Label>
            <DatePicker
              id="goal-deadline"
              value={deadline}
              onChange={setDeadline}
              placeholder={t("form.chooseDate")}
            />
          </div>
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
              {goal ? t("actions.saveChanges") : t("actions.createGoal")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
