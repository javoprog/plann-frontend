"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckSquare2,
  CircleGauge,
  Flame,
  LogOut,
  Settings,
  Target,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppLogo } from "@/components/dashboard/app-logo";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: CircleGauge },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Tasks", href: "/tasks", icon: CheckSquare2 },
  { name: "Habits", href: "/habits", icon: Flame },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Loading your plan…
        </div>
      </main>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center border-b px-5">
          <AppLogo />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-5">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

        </div>

        <div className="border-t p-3">
          <div className="rounded-xl bg-muted/60 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">Level {user.level}</Badge>
                <span className="text-[11px] text-muted-foreground">
                  {user.xp} XP total
                </span>
              </div>
              <Progress value={user.xp % 100} />
              <p className="text-[11px] text-muted-foreground">
                {user.xpToNextLevel} XP to next level
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <AppLogo className="mr-auto md:hidden" />
            <div className="hidden w-full md:block">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <nav className="flex items-center md:hidden">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.name}
                    className={cn(
                      "rounded-lg p-2 text-muted-foreground",
                      pathname === item.href && "bg-muted text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                  </Link>
                ))}
              </nav>
              <Button
                className="md:hidden"
                variant="outline"
                size="icon"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
