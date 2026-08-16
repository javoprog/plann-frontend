"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, getApiError } from "@/lib/api";
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
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="habit-title">{t("form.title")}</Label>
            <Input
              id="habit-title"
              name="title"
              defaultValue={habit?.title ?? ""}
              placeholder="Read for 20 minutes"
              minLength={2}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="habit-description">{t("form.description")}</Label>
            <Textarea
              id="habit-description"
              name="description"
              defaultValue={habit?.description ?? ""}
              placeholder="Why does this ritual matter?"
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("form.frequency")}</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as HabitFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <span>
                    {t(
                      frequency === "DAILY"
                        ? "frequency.daily"
                        : frequency === "WEEKDAYS"
                          ? "frequency.weekdays"
                          : "frequency.weekends",
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">{t("frequency.daily")}</SelectItem>
                  <SelectItem value="WEEKDAYS">{t("frequency.weekdays")}</SelectItem>
                  <SelectItem value="WEEKENDS">{t("frequency.weekends")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                      : categories.find((item) => item.id === categoryId)?.name ??
                        t("common.noCategory")}
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
          </div>
          <div className="space-y-2">
            <Label>{t("form.relatedGoal")}</Label>
            <Select
              value={goalId}
              onValueChange={(value) => setGoalId(String(value))}
            >
              <SelectTrigger className="w-full">
                <span className="truncate">
                  {goalId === "none"
                    ? t("form.noRelatedGoal")
                    : goals.find((item) => item.id === goalId)?.title ??
                      t("form.noRelatedGoal")}
                </span>
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
              {habit ? t("actions.saveChanges") : t("actions.createHabit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
