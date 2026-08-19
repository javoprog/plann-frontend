"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus, RotateCcw, Target } from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { useLanguage } from "@/components/providers/language-provider";
import {
  EmptyState,
  LoadError,
  PageSkeleton,
} from "@/components/shared/async-state";
import {
  CollectionFilter,
  CollectionToolbar,
} from "@/components/shared/collection-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCategoryFilter } from "@/hooks/use-category-filter";
import { api, getApiError } from "@/lib/api";
import { getCategoryLabel } from "@/lib/constants/categories";
import { formatDate } from "@/lib/format";
import type { Category, Goal, GoalStatus } from "@/lib/types";

type StatusFilter = Extract<GoalStatus, "IN_PROGRESS" | "COMPLETED"> | "all";

function GoalsContent() {
  const { language, t } = useLanguage();
  const { categoryId, changeCategory, searchParams } =
    useCategoryFilter("/goals");
  const handledCreate = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const categoryFilters = categories;
  const hasActiveFilters = categoryId !== "all" || status !== "all";

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const { data } = await api.get<Goal[]>("/goals", {
        params: {
          categoryId: categoryId === "all" ? undefined : categoryId,
          status: status === "all" ? undefined : status,
        },
      });
      setGoals(data);
    } catch {
      setLoadFailed(true);
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
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        title={t("goals.title")}
        description={t("goals.description")}
        action={
          <Button onClick={createGoal}>
            <Plus className="size-4" /> {t("actions.createGoal")}
          </Button>
        }
      />

      <CollectionToolbar>
        <CollectionFilter
          label={t("form.category")}
          value={categoryId}
          options={[
            { value: "all", label: t("common.all") },
            ...categoryFilters.map((category) => ({
              value: category.id,
              label: getCategoryLabel(category.name, t),
            })),
          ]}
          onValueChange={changeCategory}
        />
        <CollectionFilter
          label={t("form.status")}
          value={status}
          options={[
            { value: "all", label: t("common.all") },
            { value: "IN_PROGRESS", label: t("status.inProgress") },
            { value: "COMPLETED", label: t("status.completed") },
          ]}
          onValueChange={setStatus}
        />
      </CollectionToolbar>

      {isLoading ? (
        <PageSkeleton />
      ) : loadFailed ? (
        <LoadError onRetry={() => void loadGoals()} />
      ) : goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <Link
              key={goal.id}
              href={`/goals/${encodeURIComponent(goal.id)}`}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={goal.category} />
                      <StatusBadge status={goal.status} />
                    </div>
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {goal.description || t("common.noDescription")}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {t("goals.tasksComplete", {
                          completed: goal.completedTasks,
                          total: goal.totalTasks,
                        })}
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
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title={t("goals.noGoals")}
          description={t("goals.filterHint")}
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  changeCategory("all");
                  setStatus("all");
                }}
              >
                <RotateCcw /> {t("actions.clearFilters")}
              </Button>
            ) : (
              <Button variant="outline" onClick={createGoal}>
                <Plus /> {t("actions.createGoal")}
              </Button>
            )
          }
        />
      )}

      <GoalFormDialog
        key={`new-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        onSaved={() => void loadGoals()}
      />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GoalsContent />
    </Suspense>
  );
}
