"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckSquare2,
  ChevronsUpDown,
  CircleGauge,
  Flame,
  LogOut,
  Search,
  Settings,
  Target,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AppLogo } from "@/components/dashboard/app-logo";
import { CommandMenu } from "@/components/dashboard/command-menu";
import { useLanguage } from "@/components/providers/language-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TranslationKey } from "@/lib/i18n/translations";

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner aria-label={t("common.loading")} />
          {t("common.loading")}
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
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
          <AppLogo className="h-10 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("common.workspace")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                          />
                        }
                        isActive={active}
                        tooltip={t(item.label)}
                      >
                        <item.icon />
                        <span>{t(item.label)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="space-y-2 px-2 pb-1 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">
                {t("dashboard.currentLevel")} {user.level}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("dashboard.xpTotal", { xp: user.xp })}
              </span>
            </div>
            <Progress value={user.xp % 100} />
          </div>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      aria-label={t("common.userMenu")}
                    />
                  }
                >
                  <Avatar size="sm">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-medium">
                      {user.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  sideOffset={8}
                  align="end"
                  className="w-64"
                >
                  <DropdownMenuLabel>
                    <span className="block truncate font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="block truncate font-normal">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings />
                    {t("nav.settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut />
                    {t("actions.logOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex h-full items-center gap-2 px-4 sm:px-6">
            <SidebarTrigger aria-label={t("common.openNavigation")} />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <AppLogo className="md:hidden" />

            <Button
              variant="outline"
              className="ml-auto hidden w-full max-w-md justify-start text-muted-foreground sm:flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search />
              <span className="truncate">{t("command.searchPlaceholder")}</span>
              <KbdGroup className="ml-auto hidden lg:inline-flex">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto sm:hidden"
                    onClick={() => setCommandOpen(true)}
                    aria-label={t("command.searchPlaceholder")}
                  />
                }
              >
                <Search />
              </TooltipTrigger>
              <TooltipContent>{t("command.searchPlaceholder")}</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex-1 bg-muted/20 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </div>
      </SidebarInset>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  );
}
