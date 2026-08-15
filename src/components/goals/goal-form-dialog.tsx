"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
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
import { formatGoalStatus, getLocalDateKey } from "@/lib/format";
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
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title")),
      description: String(formData.get("description") ?? ""),
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
        toast.success("Goal updated");
      } else {
        await api.post("/goals", payload);
        toast.success("Goal created");
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
          <DialogTitle>{goal ? "Edit goal" : "Create a new goal"}</DialogTitle>
          <DialogDescription>
            Give this goal a clear outcome, category, and target date.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              name="title"
              defaultValue={goal?.title ?? ""}
              placeholder="What do you want to achieve?"
              minLength={2}
              maxLength={160}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              name="description"
              defaultValue={goal?.description ?? ""}
              placeholder="Add context, a desired result, or a useful note."
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                      : categories.find((category) => category.id === categoryId)
                          ?.name ?? "Choose a category"}
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as GoalStatus)}
              >
                <SelectTrigger className="w-full">
                  <span className="truncate">{formatGoalStatus(status)}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-deadline">Deadline</Label>
            <DatePicker
              id="goal-deadline"
              value={deadline}
              onChange={setDeadline}
              placeholder="Choose a deadline"
            />
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
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
