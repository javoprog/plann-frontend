"use client";

import { useState, type FormEvent } from "react";
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
import { getCategoryLabel } from "@/lib/constants/categories";
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {goal ? t("form.editGoalTitle") : t("form.createGoalTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.goalDescriptionText")}</DialogDescription>
        </DialogHeader>
        <form className="min-h-0" onSubmit={handleSubmit}>
          <ScrollArea className="-mx-1 max-h-[60svh] px-1">
          <FieldGroup className="py-1 pr-3">
          <Field>
            <FieldLabel htmlFor="goal-title">{t("form.title")}</FieldLabel>
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
          </Field>
          <Field>
            <FieldLabel htmlFor="goal-description">{t("form.description")}</FieldLabel>
            <Textarea
              id="goal-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("form.goalDescriptionPlaceholder")}
              rows={4}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="goal-category">{t("form.category")}</FieldLabel>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(String(value))}
              >
                <SelectTrigger id="goal-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.noCategory")}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {getCategoryLabel(category.name, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="goal-status">{t("form.status")}</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as GoalStatus)}
              >
                <SelectTrigger id="goal-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">{t("status.planned")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="goal-deadline">{t("form.deadline")}</FieldLabel>
            <DatePicker
              id="goal-deadline"
              value={deadline}
              onChange={setDeadline}
              placeholder={t("form.chooseDate")}
            />
          </Field>
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
              {goal ? t("actions.saveChanges") : t("actions.createGoal")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
