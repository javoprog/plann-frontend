"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare2,
  CircleGauge,
  Flame,
  Plus,
  Settings,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { useLanguage } from "@/components/providers/language-provider";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { api, getApiError } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { Category, Goal, SearchResults } from "@/lib/types";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type QuickAction = "goal" | "task" | "habit";

const navigation: Array<{
  label: TranslationKey;
  href: string;
  icon: typeof CircleGauge;
}> = [
  { label: "nav.dashboard", href: "/dashboard", icon: CircleGauge },
  { label: "nav.goals", href: "/goals", icon: Target },
  { label: "nav.tasks", href: "/tasks", icon: CheckSquare2 },
  { label: "nav.habits", href: "/habits", icon: Flame },
  { label: "nav.settings", href: "/settings", icon: Settings },
];

const resultGroups = [
  { key: "goals", label: "nav.goals", href: "/goals", icon: Target },
  { key: "tasks", label: "nav.tasks", href: "/tasks", icon: CheckSquare2 },
  { key: "habits", label: "nav.habits", href: "/habits", icon: Flame },
] as const satisfies ReadonlyArray<{
  key: keyof SearchResults;
  label: TranslationKey;
  href: string;
  icon: typeof Target;
}>;

const emptyResults: SearchResults = { goals: [], tasks: [], habits: [] };

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const formOptionsRequest = useRef<Promise<void> | null>(null);
  const trimmedQuery = query.trim();

  const setMenuOpen = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("");
      setResults(emptyResults);
      setIsSearching(false);
      setSearchFailed(false);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "k" || event.key === "K" || event.code === "KeyK") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setMenuOpen(!open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setMenuOpen]);

  useEffect(() => {
    if (!open || trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      api
        .get<SearchResults>("/search", {
          params: { q: trimmedQuery },
          signal: controller.signal,
        })
        .then(({ data }) => {
          setResults(data);
          setSearchFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults(emptyResults);
            setSearchFailed(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, trimmedQuery]);

  const loadFormOptions = useCallback(() => {
    if (!formOptionsRequest.current) {
      formOptionsRequest.current = Promise.all([
        api.get<Category[]>("/categories"),
        api.get<Goal[]>("/goals"),
      ])
        .then(([categoriesResponse, goalsResponse]) => {
          setCategories(categoriesResponse.data);
          setGoals(goalsResponse.data);
        })
        .catch((error: unknown) => {
          formOptionsRequest.current = null;
          throw error;
        });
    }
    return formOptionsRequest.current;
  }, []);

  function navigate(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    setSearchFailed(false);
    if (nextQuery.trim().length < 2) {
      setResults(emptyResults);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
  }

  async function openQuickAction(action: QuickAction) {
    setMenuOpen(false);
    try {
      await loadFormOptions();
      if (action === "goal") setGoalDialogOpen(true);
      if (action === "task") setTaskDialogOpen(true);
      if (action === "habit") setHabitDialogOpen(true);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  function handleSaved(destination: string) {
    formOptionsRequest.current = null;
    router.push(destination);
    router.refresh();
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setMenuOpen}
        title={t("command.searchPlaceholder")}
        description={t("command.searchPlaceholder")}
        className="sm:max-w-xl"
      >
        <CommandInput
          value={query}
          onValueChange={handleQueryChange}
          placeholder={t("command.searchPlaceholder")}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching
              ? t("search.searching")
              : searchFailed
                ? t("common.loadFailed")
                : t("command.noResults")}
          </CommandEmpty>

          <CommandGroup heading={t("command.navigation")}>
            {navigation.map((item) => (
              <CommandItem
                key={item.href}
                value={`${t(item.label)} ${item.href}`}
                onSelect={() => navigate(item.href)}
              >
                <item.icon className="size-4 text-muted-foreground" />
                <span>{t(item.label)}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={t("command.actions")}>
            <CommandItem
              value={`${t("actions.createGoal")} ${t("nav.goals")}`}
              onSelect={() => void openQuickAction("goal")}
            >
              <Plus className="size-4 text-muted-foreground" />
              <span>{t("actions.createGoal")}</span>
            </CommandItem>
            <CommandItem
              value={`${t("actions.createTask")} ${t("nav.tasks")}`}
              onSelect={() => void openQuickAction("task")}
            >
              <Plus className="size-4 text-muted-foreground" />
              <span>{t("actions.createTask")}</span>
            </CommandItem>
            <CommandItem
              value={`${t("actions.createHabit")} ${t("nav.habits")}`}
              onSelect={() => void openQuickAction("habit")}
            >
              <Plus className="size-4 text-muted-foreground" />
              <span>{t("actions.createHabit")}</span>
            </CommandItem>
          </CommandGroup>

          {trimmedQuery.length >= 2 &&
            resultGroups.map((group) => {
              const items = results[group.key];
              if (!items.length) return null;

              return (
                <CommandGroup key={group.key} heading={t(group.label)}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${group.key}-${item.id}`}
                      value={`${item.title} ${group.key}`}
                      onSelect={() =>
                        navigate(`${group.href}/${encodeURIComponent(item.id)}`)
                      }
                    >
                      <group.icon className="size-4 text-muted-foreground" />
                      <span className="truncate">{item.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
        </CommandList>
      </CommandDialog>

      <GoalFormDialog
        key={`command-goal-${goalDialogOpen}`}
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        categories={categories}
        onSaved={() => handleSaved("/goals")}
      />
      <TaskFormDialog
        key={`command-task-${taskDialogOpen}`}
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        goals={goals}
        onTaskChanged={() => undefined}
        onSaved={() => handleSaved("/tasks")}
      />
      <HabitFormDialog
        key={`command-habit-${habitDialogOpen}`}
        open={habitDialogOpen}
        onOpenChange={setHabitDialogOpen}
        categories={categories}
        goals={goals}
        onSaved={() => handleSaved("/habits")}
      />
    </>
  );
}
