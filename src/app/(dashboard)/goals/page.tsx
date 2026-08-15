"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, MoreHorizontal, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { GoalDetailDialog } from "@/components/goals/goal-detail-dialog";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { api, getApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Category, Goal, GoalStatus } from "@/lib/types";

type StatusFilter = GoalStatus | "all";

function GoalsContent() {
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
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);

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
      toast.success("Goal deleted");
      void loadGoals();
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Shape meaningful outcomes and keep an eye on the work behind them.
          </p>
        </div>
        <div>
          <Button onClick={createGoal}>
            <Plus className="size-4" /> Create Goal
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row">
        <Select
          value={categoryId}
          onValueChange={(value) => changeCategory(String(value))}
        >
          <SelectTrigger className="w-full sm:w-52">
            <span className="truncate">
              {categoryId === "all"
                ? "All categories"
                : categories.find((category) => category.id === categoryId)?.name ??
                  "All categories"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-52">
            <span className="truncate">
              {status === "all"
                ? "All statuses"
                : status === "IN_PROGRESS"
                  ? "In progress"
                  : status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-xl bg-muted" />
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
              onClick={() => setDetailGoalId(goal.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setDetailGoalId(goal.id);
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
                          <Button variant="ghost" size="icon-sm" aria-label="Goal actions" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => editGoal(goal)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => void deleteGoal(goal)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {goal.description || "No description added yet."}
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
                  {formatDate(goal.deadline)}
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
          <h2 className="font-semibold">No goals found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create a goal or change your filters to see what you are working toward.
          </p>
          <Button className="mt-4" variant="outline" onClick={createGoal}>
            <Plus className="size-4" /> Create your first goal
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
      <GoalDetailDialog
        goalId={detailGoalId}
        onOpenChange={(open) => !open && setDetailGoalId(null)}
        onChanged={() => void loadGoals()}
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
