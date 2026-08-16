"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { api, getApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Category, Goal, GoalStatus } from "@/lib/types";

type StatusFilter = Extract<GoalStatus, "IN_PROGRESS" | "COMPLETED"> | "all";

const GOAL_CATEGORY_FILTERS = [
  "Work",
  "Education",
  "Health",
  "Travel",
  "Personal",
] as const;

function GoalsContent() {
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") ?? "all";
  const handledCreate = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const categoryFilters = GOAL_CATEGORY_FILTERS.map((name) =>
    categories.find((category) => category.name === name),
  ).filter((category): category is Category => Boolean(category));

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Goal[]>("/goals", {
        params: {
          categoryId: categoryId === "all" ? undefined : categoryId,
          status: status === "all" ? undefined : status,
        },
      });
      setGoals(data);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, status]);

  useEffect(() => {
    if (searchParams.get("create") === "true" && !handledCreate.current) {
      handledCreate.current = true;
      queueMicrotask(() => setFormOpen(true));
    }

    api
      .get<Category[]>("/categories")
      .then(({ data }) => setCategories(data))
      .catch((error: unknown) => toast.error(getApiError(error)));
  }, [searchParams]);

  useEffect(() => {
    queueMicrotask(() => void loadGoals());
  }, [loadGoals]);

  function createGoal() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function changeCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("categoryId");
    else params.set("categoryId", value);
    router.push(`/goals${params.size ? `?${params.toString()}` : ""}`);
  }

  function editGoal(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  async function deleteGoal(goal: Goal) {
    if (!window.confirm(`Delete “${goal.title}” and its linked tasks?`)) return;
    try {
      await api.delete(`/goals/${goal.id}`);
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
      toast.success(t("toast.goalDeleted"));
      void loadGoals();
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("goals.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("goals.description")}
          </p>
        </div>
        <div>
          <Button onClick={createGoal}>
            <Plus className="size-4" /> {t("actions.createGoal")}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            {t("form.category")}
          </span>
          <Button
            size="sm"
            variant={categoryId === "all" ? "default" : "outline"}
            onClick={() => changeCategory("all")}
          >
            {t("tasks.all")}
          </Button>
          {categoryFilters.map((category) => (
            <Button
              key={category.id}
              size="sm"
              variant={categoryId === category.id ? "default" : "outline"}
              onClick={() => changeCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            {t("form.status")}
          </span>
          {(
            [
              ["all", t("tasks.all")],
              ["IN_PROGRESS", t("status.inProgress")],
              ["COMPLETED", t("status.completed")],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => router.push(`/goals/${goal.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter") router.push(`/goals/${goal.id}`);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={goal.category} />
                      <StatusBadge status={goal.status} />
                    </div>
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                  </div>
                  <div onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Goal actions"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editGoal(goal)}>
                          <Pencil className="size-4" /> {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void deleteGoal(goal)}
                        >
                          <Trash2 className="size-4" /> {t("actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {goal.description || t("common.noDescription")}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {goal.completedTasks}/{goal.totalTasks} tasks
                    </span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatDate(goal.deadline, language, t("common.noDueDate"))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-background text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Target className="size-6 text-muted-foreground" />
          </span>
          <h2 className="font-semibold">{t("goals.noGoals")}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a goal or change your filters to see what you are working
            toward.
          </p>
          <Button className="mt-4" variant="outline" onClick={createGoal}>
            <Plus className="size-4" /> {t("actions.createGoal")}
          </Button>
        </div>
      )}

      <GoalFormDialog
        key={`${editingGoal?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        goal={editingGoal}
        onSaved={() => void loadGoals()}
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense
      fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}
    >
      <GoalsContent />
    </Suspense>
  );
}
