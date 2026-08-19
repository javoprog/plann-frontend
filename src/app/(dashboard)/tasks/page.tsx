"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { CalendarDays, CheckSquare2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  EmptyState,
  LoadError,
  PageSkeleton,
} from "@/components/shared/async-state";
import {
  CollectionFilter,
  CollectionSort,
  CollectionToolbar,
} from "@/components/shared/collection-toolbar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { useCategoryFilter } from "@/hooks/use-category-filter";
import { api, getApiError } from "@/lib/api";
import { getCategoryLabel } from "@/lib/constants/categories";
import { celebrateNewlyCompletedGoals } from "@/lib/confetti";
import { formatDate, isOverdue, isThisWeek, isToday } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Category, Goal, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type TaskRelationshipFilter = "all" | "standalone" | "linked";
type TaskDateFilter = "all" | "today" | "week" | "overdue";
type TaskSort = "dueDate" | "priority";

const PRIORITY_SORT_ORDER = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

function TasksContent() {
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const { categoryId, changeCategory, searchParams } =
    useCategoryFilter("/tasks");
  const handledCreate = useRef(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [relationship, setRelationship] =
    useState<TaskRelationshipFilter>("all");
  const [dateFilter, setDateFilter] = useState<TaskDateFilter>("all");
  const [sort, setSort] = useState<TaskSort>("dueDate");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [tasksResponse, goalsResponse] = await Promise.all([
        api.get<Task[]>("/tasks"),
        api.get<Goal[]>("/goals"),
      ]);
      setTasks(tasksResponse.data);
      setGoals(goalsResponse.data);
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "true" && !handledCreate.current) {
      handledCreate.current = true;
      queueMicrotask(() => setFormOpen(true));
    }
    queueMicrotask(() => void loadData());
  }, [loadData, searchParams]);

  const categoryFilters = useMemo(() => {
    const uniqueCategories = new Map<string, Category>();
    goals.forEach((goal) => {
      if (goal.category) uniqueCategories.set(goal.category.id, goal.category);
    });
    return [...uniqueCategories.values()];
  }, [goals]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (relationship === "standalone") {
      filtered = filtered.filter((task) => !task.goalId);
    } else if (relationship === "linked") {
      filtered = filtered.filter((task) => Boolean(task.goalId));
    }
    if (categoryId !== "all") {
      filtered = filtered.filter(
        (task) => task.goal?.category?.id === categoryId,
      );
    }
    if (dateFilter === "today") {
      filtered = filtered.filter((task) => isToday(task.dueDate));
    } else if (dateFilter === "week") {
      filtered = filtered.filter((task) => isThisWeek(task.dueDate));
    } else if (dateFilter === "overdue") {
      filtered = filtered.filter(
        (task) => !task.isCompleted && isOverdue(task.dueDate),
      );
    }
    return [...filtered].sort((first, second) => {
      if (sort === "priority") {
        return (
          PRIORITY_SORT_ORDER[second.priority] -
          PRIORITY_SORT_ORDER[first.priority]
        );
      }
      if (!first.dueDate) return second.dueDate ? 1 : 0;
      if (!second.dueDate) return -1;
      return (
        new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime()
      );
    });
  }, [categoryId, dateFilter, relationship, sort, tasks]);

  const emptyStateTitle =
    dateFilter === "overdue"
      ? t("tasks.noOverdue")
      : dateFilter === "today"
        ? t("tasks.noToday")
        : dateFilter === "week"
          ? t("tasks.noThisWeek")
          : t("tasks.noTasks");
  const hasActiveFilters =
    relationship !== "all" ||
    categoryId !== "all" ||
    dateFilter !== "all";

  function updateTask(updatedTask: Task) {
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
  }

  function createTask() {
    setFormOpen(true);
  }

  async function syncAfterMutation(previousGoals: Goal[]) {
    try {
      const [tasksResponse, goalsResponse] = await Promise.all([
        api.get<Task[]>("/tasks"),
        api.get<Goal[]>("/goals"),
      ]);
      setTasks(tasksResponse.data);
      setGoals(goalsResponse.data);
      celebrateNewlyCompletedGoals(previousGoals, goalsResponse.data);
      void refreshUser().catch((error: unknown) =>
        toast.error(getApiError(error)),
      );
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function toggleTask(task: Task, isCompleted: boolean) {
    if (updatingTaskId) return;
    const previousGoals = goals;
    setUpdatingTaskId(task.id);
    updateTask(withTaskCompletion(task, isCompleted));
    try {
      const { data } = await api.patch<Task>(`/tasks/${task.id}`, {
        isCompleted,
      });
      updateTask(data);
      await syncAfterMutation(previousGoals);
    } catch (error) {
      updateTask(task);
      toast.error(getApiError(error));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <PageHeader
        title={t("tasks.title")}
        description={t("tasks.description")}
        action={
          <Button onClick={createTask}>
            <Plus className="size-4" /> {t("actions.createTask")}
          </Button>
        }
      />

      <CollectionToolbar
        sort={
          <CollectionSort
            id="task-sort"
            label={t("common.sortBy")}
            value={sort}
            options={[
              { value: "dueDate", label: t("tasks.sortDueDate") },
              { value: "priority", label: t("tasks.sortPriority") },
            ]}
            onValueChange={setSort}
          />
        }
      >
        <CollectionFilter
          label={t("tasks.relationship")}
          value={relationship}
          options={[
            { value: "all", label: t("common.all") },
            { value: "standalone", label: t("tasks.standalone") },
            { value: "linked", label: t("tasks.linked") },
          ]}
          onValueChange={setRelationship}
        />
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
          label={t("form.dueDate")}
          value={dateFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "today", label: t("tasks.today") },
            { value: "week", label: t("tasks.thisWeek") },
            { value: "overdue", label: t("tasks.overdue") },
          ]}
          onValueChange={setDateFilter}
        />
      </CollectionToolbar>

      {isLoading ? (
        <PageSkeleton variant="list" count={4} />
      ) : loadFailed ? (
        <LoadError onRetry={() => void loadData()} />
      ) : filteredTasks.length ? (
        <Card>
          <CardContent>
            <ItemGroup className="gap-1">
              {filteredTasks.map((task) => (
                <Item
                  key={task.id}
                  role="listitem"
                  className="items-start hover:bg-muted/50"
                >
                  <Checkbox
                    className="mt-1"
                    checked={task.isCompleted}
                    disabled={Boolean(updatingTaskId)}
                    onCheckedChange={(checked) =>
                      void toggleTask(task, Boolean(checked))
                    }
                    aria-label={
                      task.isCompleted
                        ? `${t("actions.undo")}: ${task.title}`
                        : `${t("actions.markTaskComplete")}: ${task.title}`
                    }
                  />
                  <ItemContent className="min-w-0">
                    <ItemTitle className="flex-wrap">
                      <Link
                        href={`/tasks/${encodeURIComponent(task.id)}`}
                        className={cn(
                          "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          task.isCompleted &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </Link>
                      <PriorityBadge priority={task.priority} />
                      {task.goal?.category && (
                        <CategoryBadge category={task.goal.category} />
                      )}
                    </ItemTitle>
                    <ItemDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>{task.goal?.title ?? t("common.standalone")}</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3" />{" "}
                        {formatDate(
                          task.dueDate,
                          language,
                          t("common.noDueDate"),
                        )}
                      </span>
                      <span>
                        {t("tasks.subtasks", {
                          completed: (task.subtasks ?? []).filter(
                            (subtask) => subtask.isCompleted,
                          ).length,
                          total: task.subtasks?.length ?? 0,
                        })}
                      </span>
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={CheckSquare2}
          title={emptyStateTitle}
          description={t("tasks.adjustFiltersHint")}
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setRelationship("all");
                  changeCategory("all");
                  setDateFilter("all");
                }}
              >
                <RotateCcw /> {t("actions.clearFilters")}
              </Button>
            ) : (
              <Button variant="outline" onClick={createTask}>
                <Plus /> {t("actions.createTask")}
              </Button>
            )
          }
        />
      )}

      <TaskFormDialog
        key={`new-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        goals={goals}
        onTaskChanged={updateTask}
        onSaved={() => void syncAfterMutation(goals)}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" count={4} />}>
      <TasksContent />
    </Suspense>
  );
}
