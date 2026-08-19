"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ExternalLink,
  Languages,
  Link2Off,
  Loader2,
  Palette,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { api, getApiError } from "@/lib/api";
import type { Language, ThemePreference, User } from "@/lib/types";

export default function SettingsPage() {
  const { user, updateUser, refreshUser, changeTheme } = useAuth();
  const { language, t, changeLanguage } = useLanguage();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isConnectingTelegram, setIsConnectingTelegram] = useState(false);
  const [isUpdatingTelegram, setIsUpdatingTelegram] = useState(false);
  const [telegramLink, setTelegramLink] = useState<{
    code: string;
    botUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!telegramLink) return;

    const refreshTelegramStatus = () => {
      void refreshUser().catch(() => undefined);
    };
    window.addEventListener("focus", refreshTelegramStatus);
    return () => window.removeEventListener("focus", refreshTelegramStatus);
  }, [refreshUser, telegramLink]);

  useEffect(() => {
    if (user?.telegramChatId) setTelegramLink(null);
  }, [user?.telegramChatId]);

  if (!user) return null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSavingProfile(true);
    try {
      const { data } = await api.patch<User>("/users/profile", {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
      });
      updateUser(data);
      toast.success(t("toast.profileUpdated"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      toast.error(t("toast.passwordsDoNotMatch"));
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.patch("/users/password", {
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword,
        confirmPassword,
      });
      form.reset();
      toast.success(t("toast.passwordUpdated"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function updateTheme(theme: ThemePreference) {
    if (!user || theme === user.theme || isSavingTheme) return;
    setIsSavingTheme(true);
    try {
      await changeTheme(theme);
      toast.success(t("toast.themeUpdated"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function updateLanguage(language: Language) {
    if (isSavingLanguage) return;
    setIsSavingLanguage(true);
    try {
      await changeLanguage(language);
      toast.success(t("toast.languageUpdated"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSavingLanguage(false);
    }
  }

  async function createTelegramLink() {
    if (isConnectingTelegram) return;
    setIsConnectingTelegram(true);
    try {
      const { data } = await api.post<{ code: string; botUrl: string }>(
        "/users/telegram-link-code",
      );
      setTelegramLink(data);
      if (data.botUrl) {
        window.open(data.botUrl, "_blank", "noopener,noreferrer");
      }
      toast.success(t("settings.telegramOpening"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsConnectingTelegram(false);
    }
  }

  async function toggleTelegramNotifications() {
    if (!user || isUpdatingTelegram) return;
    setIsUpdatingTelegram(true);
    try {
      const { data } = await api.patch<User>("/users/telegram-notifications", {
        telegramNotifications: !user.telegramNotifications,
      });
      updateUser(data);
      toast.success(t("toast.telegramNotificationsUpdated"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsUpdatingTelegram(false);
    }
  }

  async function unlinkTelegram() {
    if (isUpdatingTelegram) return;
    setIsUpdatingTelegram(true);
    try {
      const { data } = await api.delete<User>("/users/telegram");
      updateUser(data);
      setTelegramLink(null);
      toast.success(t("toast.telegramUnlinked"));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsUpdatingTelegram(false);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("settings.description")}
          </p>
        </div>
        <div />
      </div>

      <div className="grid max-w-4xl gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </div>
            <CardTitle>{t("settings.profile")}</CardTitle>
            <CardDescription>
              {t("settings.profileDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={`${user.name}-${user.email}`}
              className="space-y-4"
              onSubmit={saveProfile}
            >
              <div className="space-y-2">
                <Label htmlFor="settings-name">{t("settings.name")}</Label>
                <Input
                  id="settings-name"
                  name="name"
                  defaultValue={user.name}
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">{t("settings.email")}</Label>
                <Input
                  id="settings-email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile && <Loader2 className="size-4 animate-spin" />}
                {t("settings.saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Palette className="size-5" />
            </div>
            <CardTitle>{t("settings.appearance")}</CardTitle>
            <CardDescription>
              {t("settings.appearanceDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <Select
              value={user.theme}
              disabled={isSavingTheme}
              onValueChange={(value) =>
                void updateTheme(value as ThemePreference)
              }
            >
              <SelectTrigger className="w-full">
                <span>{t(`settings.${user.theme}`)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t("settings.system")}</SelectItem>
                <SelectItem value="light">{t("settings.light")}</SelectItem>
                <SelectItem value="dark">{t("settings.dark")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("settings.systemThemeHint")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Languages className="size-5" />
            </div>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>
              {t("settings.languageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select
              value={language}
              disabled={isSavingLanguage}
              onValueChange={(value) => void updateLanguage(value as Language)}
            >
              <SelectTrigger className="w-full">
                <span>{language.toUpperCase()}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English (EN)</SelectItem>
                <SelectItem value="ru">Русский (RU)</SelectItem>
                <SelectItem value="uz">O‘zbekcha (UZ)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Send className="size-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t("settings.telegramTitle")}</CardTitle>
              {user.telegramChatId && (
                <Badge variant="secondary">
                  🟢 {t("settings.telegramConnected")}
                </Badge>
              )}
            </div>
            <CardDescription>
              {t("settings.telegramDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.telegramChatId ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:min-w-80">
                  <div>
                    <p className="text-sm font-medium">
                      {t("settings.telegramNotifications")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.telegramNotificationsDescription")}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={user.telegramNotifications}
                    aria-label={t("settings.telegramNotifications")}
                    disabled={isUpdatingTelegram}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      user.telegramNotifications ? "bg-primary" : "bg-muted"
                    }`}
                    onClick={() => void toggleTelegramNotifications()}
                  >
                    <span
                      className={`pointer-events-none block size-5 translate-y-0.5 rounded-full bg-background shadow-sm transition-transform ${
                        user.telegramNotifications
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <Button
                  variant="outline"
                  disabled={isUpdatingTelegram}
                  onClick={() => void unlinkTelegram()}
                >
                  {isUpdatingTelegram ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2Off className="size-4" />
                  )}
                  {t("settings.telegramUnlink")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {!telegramLink ? (
                  <Button
                    disabled={isConnectingTelegram}
                    onClick={() => void createTelegramLink()}
                  >
                    {isConnectingTelegram ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {t("settings.telegramConnect")}
                  </Button>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.telegramLinkExpires", {
                        code: telegramLink.code,
                      })}
                    </p>
                    <Button
                      onClick={() =>
                        window.open(
                          telegramLink.botUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="size-4" />
                      {t("settings.telegramOpenBot")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>{t("settings.security")}</CardTitle>
            <CardDescription>
              {t("settings.securityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={updatePassword}
            >
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="current-password">
                  {t("settings.currentPassword")}
                </Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {t("settings.newPassword")}
                </Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  {t("settings.confirmPassword")}
                </Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {t("settings.updatePassword")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
