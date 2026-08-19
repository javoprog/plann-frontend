"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import type {
  Category,
  Goal,
  Habit,
  HabitFrequency,
} from "@/lib/types";

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  goals: Goal[];
  habit?: Habit | null;
  defaultGoalId?: string;
  onSaved: () => void;
}

export function HabitFormDialog({
  open,
  onOpenChange,
  categories,
  goals,
  habit,
  defaultGoalId,
  onSaved,
}: HabitFormDialogProps) {
  const { t } = useLanguage();
  const [frequency, setFrequency] = useState<HabitFrequency>(
    habit?.frequency ?? "DAILY",
  );
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? "none");
  const [goalId, setGoalId] = useState(
    habit?.goalId ?? defaultGoalId ?? "none",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      frequency,
      categoryId: categoryId === "none" ? null : categoryId,
      goalId: goalId === "none" ? null : goalId,
    };

    setIsSubmitting(true);
    try {
      if (habit) {
        await api.patch(`/habits/${habit.id}`, payload);
        toast.success(t("toast.habitUpdated"));
      } else {
        await api.post("/habits", payload);
        toast.success(t("toast.habitCreated"));
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
            {habit ? t("form.editHabitTitle") : t("form.createHabitTitle")}
          </DialogTitle>
          <DialogDescription>{t("form.habitDescriptionText")}</DialogDescription>
        </DialogHeader>
        <form className="min-h-0" onSubmit={handleSubmit}>
          <ScrollArea className="-mx-1 max-h-[60svh] px-1">
          <FieldGroup className="py-1 pr-3">
          <Field>
            <FieldLabel htmlFor="habit-title">{t("form.title")}</FieldLabel>
            <Input
              id="habit-title"
              name="title"
              defaultValue={habit?.title ?? ""}
              placeholder={t("form.habitTitlePlaceholder")}
              minLength={2}
              maxLength={200}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="habit-description">{t("form.description")}</FieldLabel>
            <Textarea
              id="habit-description"
              name="description"
              defaultValue={habit?.description ?? ""}
              placeholder={t("form.habitDescriptionPlaceholder")}
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="habit-frequency">{t("form.frequency")}</FieldLabel>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as HabitFrequency)
                }
              >
                <SelectTrigger id="habit-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t("frequency.daily")}</SelectItem>
                  <SelectItem value="WEEKDAYS">{t("frequency.weekdays")}</SelectItem>
                  <SelectItem value="WEEKENDS">{t("frequency.weekends")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="habit-category">{t("form.category")}</FieldLabel>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(String(value))}
              >
                <SelectTrigger id="habit-category" className="w-full">
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
          </div>
          <Field>
            <FieldLabel htmlFor="habit-goal">{t("form.relatedGoal")}</FieldLabel>
            <Select
              value={goalId}
              onValueChange={(value) => setGoalId(String(value))}
            >
              <SelectTrigger id="habit-goal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("form.noRelatedGoal")}</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {habit ? t("actions.saveChanges") : t("actions.createHabit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
