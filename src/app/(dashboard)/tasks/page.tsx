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
import { useSearchParams } from "next/navigation";
import { CalendarDays, CheckSquare2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getApiError } from "@/lib/api";
import { celebrateNewlyCompletedGoals } from "@/lib/confetti";
import { formatDate, isOverdue, isThisWeek, isToday } from "@/lib/format";
import { withTaskCompletion } from "@/lib/task-completion";
import type { Goal, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type TaskTab = "all" | "standalone" | "linked";
type TaskDateFilter = "all" | "today" | "week" | "overdue";
type TaskSort = "dueDate" | "priority";

const PRIORITY_SORT_ORDER = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

function TasksContent() {
  const { refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const handledCreate = useRef(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tab, setTab] = useState<TaskTab>("all");
  const [dateFilter, setDateFilter] = useState<TaskDateFilter>("all");
  const [sort, setSort] = useState<TaskSort>("dueDate");
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksResponse, goalsResponse] = await Promise.all([
        api.get<Task[]>("/tasks"),
        api.get<Goal[]>("/goals"),
      ]);
      setTasks(tasksResponse.data);
      setGoals(goalsResponse.data);
    } catch (error) {
      toast.error(getApiError(error));
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

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (tab === "standalone") {
      filtered = filtered.filter((task) => !task.goalId);
    } else if (tab === "linked") {
      filtered = filtered.filter((task) => Boolean(task.goalId));
    }
    if (categoryId) {
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
  }, [categoryId, dateFilter, sort, tab, tasks]);

  const emptyStateTitle =
    dateFilter === "overdue"
      ? t("tasks.noOverdue")
      : dateFilter === "today"
        ? t("tasks.noToday")
        : dateFilter === "week"
          ? t("tasks.noThisWeek")
          : t("tasks.noTasks");

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
    const previousGoals = goals;
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
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("tasks.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tasks.description")}
          </p>
        </div>
        <div>
          <Button onClick={createTask}>
            <Plus className="size-4" /> {t("actions.createTask")}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TaskTab)}>
        <TabsList>
          <TabsTrigger value="all">{t("tasks.all")}</TabsTrigger>
          <TabsTrigger value="standalone">{t("tasks.standalone")}</TabsTrigger>
          <TabsTrigger value="linked">{t("tasks.linked")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", t("tasks.all")],
              ["today", t("tasks.today")],
              ["week", t("tasks.thisWeek")],
              ["overdue", t("tasks.overdue")],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={dateFilter === value ? "default" : "outline"}
              onClick={() => setDateFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as TaskSort)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <span>
              {sort === "dueDate"
                ? t("tasks.sortDueDate")
                : t("tasks.sortPriority")}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">{t("tasks.sortDueDate")}</SelectItem>
            <SelectItem value="priority">{t("tasks.sortPriority")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : filteredTasks.length ? (
          <div className="divide-y">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/30"
              >
                <Checkbox
                  className="mt-1"
                  checked={task.isCompleted}
                  onCheckedChange={(checked) =>
                    void toggleTask(task, Boolean(checked))
                  }
                  aria-label={`Mark ${task.title} complete`}
                />
                <Link
                  href={`/tasks/${encodeURIComponent(task.id)}`}
                  className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "font-medium",
                        task.isCompleted &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <PriorityBadge priority={task.priority} />
                    {task.goal?.category && (
                      <CategoryBadge category={task.goal.category} />
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <CheckSquare2 className="size-6 text-muted-foreground" />
            </span>
            <h2 className="font-semibold">{emptyStateTitle}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("tasks.switchTabsHint")}
            </p>
            <Button className="mt-4" variant="outline" onClick={createTask}>
              <Plus className="size-4" /> {t("actions.createTask")}
            </Button>
          </div>
        )}
      </div>

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
    <Suspense
      fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}
    >
      <TasksContent />
    </Suspense>
  );
}
