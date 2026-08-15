"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckSquare2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/dashboard/category-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { SubtaskChecklist } from "@/components/tasks/subtask-checklist";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getApiError } from "@/lib/api";
import { formatDate, isOverdue, isThisWeek, isToday } from "@/lib/format";
import type { Goal, Subtask, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type TaskTab = "all" | "standalone" | "linked";
type TaskDateFilter = "all" | "today" | "week" | "overdue";

function TasksContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const handledCreate = useRef(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tab, setTab] = useState<TaskTab>("all");
  const [dateFilter, setDateFilter] = useState<TaskDateFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    return filtered;
  }, [categoryId, dateFilter, tab, tasks]);

  function updateSubtasks(taskId: string, subtasks: Subtask[]) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, subtasks } : task,
      ),
    );
  }

  function createTask() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function editTask(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  async function toggleTask(task: Task, isCompleted: boolean) {
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, isCompleted } : item,
      ),
    );
    try {
      await api.patch(`/tasks/${task.id}`, { isCompleted });
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, isCompleted: task.isCompleted }
            : item,
        ),
      );
      toast.error(getApiError(error));
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.success("Task deleted");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Keep every next step in one place, whether standalone or goal-linked.
          </p>
        </div>
        <div>
          <Button onClick={createTask}>
            <Plus className="size-4" /> Create Task
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TaskTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="standalone">Standalone</TabsTrigger>
          <TabsTrigger value="linked">Linked to Goals</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        {([
          ["all", "All"],
          ["today", "Today"],
          ["week", "This Week"],
          ["overdue", "Overdue"],
        ] as const).map(([value, label]) => (
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

      <div className="overflow-hidden rounded-xl border bg-background">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />
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
                <div className="min-w-0 flex-1">
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
                    <span>{task.goal?.title ?? "Standalone"}</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" /> {formatDate(task.dueDate)}
                    </span>
                  </div>
                  <SubtaskChecklist
                    taskId={task.id}
                    subtasks={task.subtasks}
                    onChange={(subtasks) => updateSubtasks(task.id, subtasks)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label="Task actions" />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => editTask(task)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => void deleteTask(task)}
                    >
                      <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <CheckSquare2 className="size-6 text-muted-foreground" />
            </span>
            <h2 className="font-semibold">No tasks here</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a task or switch tabs to see another part of your list.
            </p>
            <Button className="mt-4" variant="outline" onClick={createTask}>
              <Plus className="size-4" /> Create your first task
            </Button>
          </div>
        )}
      </div>

      <TaskFormDialog
        key={`${editingTask?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        goals={goals}
        task={editingTask}
        onSaved={() => void loadData()}
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
