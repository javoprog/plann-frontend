"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getApiError } from "@/lib/api";
import { celebratePlanApplied } from "@/lib/confetti";
import type { AiGoalPlan, HabitFrequency, Priority } from "@/lib/types";

type PreviewTask = AiGoalPlan["tasks"][number] & { selected: boolean };
type PreviewHabit = AiGoalPlan["habits"][number] & { selected: boolean };

interface AiBreakdownDialogProps {
  goalId: string;
  goalTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void | Promise<void>;
}

function priorityKey(priority: Priority) {
  if (priority === "LOW") return "priority.low" as const;
  if (priority === "HIGH") return "priority.high" as const;
  return "priority.medium" as const;
}

function frequencyKey(frequency: HabitFrequency) {
  if (frequency === "WEEKDAYS") return "frequency.weekdays" as const;
  if (frequency === "WEEKENDS") return "frequency.weekends" as const;
  return "frequency.daily" as const;
}

export function AiBreakdownDialog({
  goalId,
  goalTitle,
  open,
  onOpenChange,
  onApplied,
}: AiBreakdownDialogProps) {
  const { t } = useLanguage();
  const [additionalContext, setAdditionalContext] = useState("");
  const [tasks, setTasks] = useState<PreviewTask[]>([]);
  const [habits, setHabits] = useState<PreviewHabit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const hasPlan = tasks.length > 0 || habits.length > 0;
  const selectedItems = [
    ...tasks.filter((task) => task.selected),
    ...habits.filter((habit) => habit.selected),
  ];
  const canApply =
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.title.trim().length >= 2);

  function reset() {
    setAdditionalContext("");
    setTasks([]);
    setHabits([]);
    setIsGenerating(false);
    setIsApplying(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function generatePlan() {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { data } = await api.post<AiGoalPlan>("/ai/breakdown-goal", {
        goalId,
        additionalContext: additionalContext.trim() || undefined,
      });
      setTasks(data.tasks.map((task) => ({ ...task, selected: true })));
      setHabits(data.habits.map((habit) => ({ ...habit, selected: true })));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function applyPlan() {
    if (!canApply || isApplying) {
      if (selectedItems.length === 0) toast.error(t("ai.selectOne"));
      return;
    }

    setIsApplying(true);
    try {
      await api.post(`/goals/${goalId}/apply-ai-plan`, {
        tasks: tasks
          .filter((task) => task.selected)
          .map(({ title, priority }) => ({ title: title.trim(), priority })),
        habits: habits
          .filter((habit) => habit.selected)
          .map(({ title, frequency }) => ({
            title: title.trim(),
            frequency,
          })),
      });
      celebratePlanApplied();
      toast.success(t("ai.planApplied"));
      handleOpenChange(false);
      await onApplied();
    } catch (error) {
      toast.error(getApiError(error));
      setIsApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> {t("aiAssistant")}
          </DialogTitle>
          <DialogDescription>{goalTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-additional-context">
              {t("ai.additionalContext")}
            </Label>
            <Textarea
              id="ai-additional-context"
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              placeholder={t("ai.contextPlaceholder")}
              maxLength={2000}
              rows={3}
            />
          </div>

          <Button
            type="button"
            className="w-full"
            variant={hasPlan ? "outline" : "default"}
            disabled={isGenerating || isApplying}
            onClick={() => void generatePlan()}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {t("generatePlan")}
          </Button>

          {isGenerating && (
            <div className="flex animate-pulse items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
              <Sparkles className="size-4" /> {t("ai.generating")}
            </div>
          )}

          {hasPlan && !isGenerating && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("tasksProposed")}</h3>
                <div className="space-y-2">
                  {tasks.map((task, index) => (
                    <div
                      key={`task-${index}`}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        className="mt-2"
                        checked={task.selected}
                        onCheckedChange={(checked) =>
                          setTasks((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, selected: Boolean(checked) }
                                : item,
                            ),
                          )
                        }
                        aria-label={`${t("tasksProposed")} ${index + 1}`}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          value={task.title}
                          onChange={(event) =>
                            setTasks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          maxLength={200}
                          aria-label={`${t("tasksProposed")} ${index + 1}`}
                        />
                        <Badge variant="secondary">
                          {t(priorityKey(task.priority))}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("habitsProposed")}</h3>
                <div className="space-y-2">
                  {habits.map((habit, index) => (
                    <div
                      key={`habit-${index}`}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        className="mt-2"
                        checked={habit.selected}
                        onCheckedChange={(checked) =>
                          setHabits((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, selected: Boolean(checked) }
                                : item,
                            ),
                          )
                        }
                        aria-label={`${t("habitsProposed")} ${index + 1}`}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          value={habit.title}
                          onChange={(event) =>
                            setHabits((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, title: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          maxLength={200}
                          aria-label={`${t("habitsProposed")} ${index + 1}`}
                        />
                        <Badge variant="secondary">
                          {t(frequencyKey(habit.frequency))}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isApplying}
            onClick={() => handleOpenChange(false)}
          >
            {t("actions.cancel")}
          </Button>
          {hasPlan && (
            <Button
              type="button"
              disabled={!canApply || isApplying || isGenerating}
              onClick={() => void applyPlan()}
            >
              {isApplying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("applyPlan")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
