"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  onSaved: () => void;
}

const frequencyLabels: Record<HabitFrequency, string> = {
  DAILY: "Every day",
  WEEKDAYS: "Weekdays",
  WEEKENDS: "Weekends",
};

export function HabitFormDialog({
  open,
  onOpenChange,
  categories,
  goals,
  habit,
  onSaved,
}: HabitFormDialogProps) {
  const [frequency, setFrequency] = useState<HabitFrequency>(
    habit?.frequency ?? "DAILY",
  );
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? "none");
  const [goalId, setGoalId] = useState(habit?.goalId ?? "none");
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
        toast.success("Habit updated");
      } else {
        await api.post("/habits", payload);
        toast.success("Habit created");
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
          <DialogTitle>{habit ? "Edit habit" : "Create a new habit"}</DialogTitle>
          <DialogDescription>
            Choose a simple rhythm you can repeat consistently.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="habit-title">Title</Label>
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
            <Label htmlFor="habit-description">Description</Label>
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
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value) =>
                  setFrequency(value as HabitFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <span>{frequencyLabels[frequency]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setCategoryId(String(value))}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">
                    {categoryId === "none"
                      ? "No category"
                      : categories.find((item) => item.id === categoryId)?.name ??
                        "No category"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
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
            <Label>Related goal</Label>
            <Select
              value={goalId}
              onValueChange={(value) => setGoalId(String(value))}
            >
              <SelectTrigger className="w-full">
                <span className="truncate">
                  {goalId === "none"
                    ? "No related goal"
                    : goals.find((item) => item.id === goalId)?.title ??
                      "No related goal"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No related goal</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {habit ? "Save changes" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
