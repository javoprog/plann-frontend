"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare2, Flame, Search, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { SearchResults } from "@/lib/types";

const groups = [
  { key: "goals", label: "Goals", href: "/goals", icon: Target },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: CheckSquare2 },
  { key: "habits", label: "Habits", href: "/habits", icon: Flame },
] as const;

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      api
        .get<SearchResults>("/search", {
          params: { q: trimmedQuery },
          signal: controller.signal,
        })
        .then(({ data }) => setResults(data))
        .catch(() => {
          if (!controller.signal.aborted) setResults(null);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  const hasResults =
    results &&
    (results.goals.length > 0 ||
      results.tasks.length > 0 ||
      results.habits.length > 0);
  const showOverlay = focused && trimmedQuery.length >= 2;

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search goals, tasks, and habits"
        autoComplete="off"
        className="bg-muted/50 pl-9"
        placeholder="Search goals, tasks, and habits…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setFocused(false);
        }}
      />

      {showOverlay && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-96 overflow-y-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
          {results === null ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          ) : hasResults ? (
            <div className="space-y-3">
              {groups.map((group) => {
                const items = results[group.key];
                if (!items.length) return null;
                return (
                  <div key={group.key}>
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          href={group.href}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                          onClick={() => {
                            setQuery("");
                            setFocused(false);
                          }}
                        >
                          <group.icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              No matching goals, tasks, or habits.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
