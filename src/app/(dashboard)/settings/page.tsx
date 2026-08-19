"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CircleCheck,
  ExternalLink,
  Languages,
  Link2Off,
  Palette,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
    if (!telegramLink || user?.telegramChatId) return;

    const refreshTelegramStatus = () => {
      void refreshUser().catch(() => undefined);
    };
    window.addEventListener("focus", refreshTelegramStatus);
    return () => window.removeEventListener("focus", refreshTelegramStatus);
  }, [refreshUser, telegramLink, user?.telegramChatId]);

  if (!user) return null;

  const activeTelegramLink = user.telegramChatId ? null : telegramLink;

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
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid max-w-4xl gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
              onSubmit={saveProfile}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="settings-name">
                    {t("settings.name")}
                  </FieldLabel>
                <Input
                  id="settings-name"
                  name="name"
                  defaultValue={user.name}
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-email">
                    {t("settings.email")}
                  </FieldLabel>
                <Input
                  id="settings-email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  autoComplete="email"
                  required
                />
                </Field>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile && (
                    <Spinner aria-label={t("common.loading")} />
                  )}
                  {t("settings.saveProfile")}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Palette className="size-5" />
            </div>
            <CardTitle>{t("settings.appearance")}</CardTitle>
            <CardDescription>
              {t("settings.appearanceDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="settings-theme">
                {t("settings.theme")}
              </FieldLabel>
              <Select
                value={user.theme}
                disabled={isSavingTheme}
                onValueChange={(value) =>
                  void updateTheme(value as ThemePreference)
                }
              >
                <SelectTrigger id="settings-theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("settings.system")}</SelectItem>
                  <SelectItem value="light">{t("settings.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {t("settings.systemThemeHint")}
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Languages className="size-5" />
            </div>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>
              {t("settings.languageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="settings-language">
                {t("settings.language")}
              </FieldLabel>
              <Select
                value={language}
                disabled={isSavingLanguage}
                onValueChange={(value) =>
                  void updateLanguage(value as Language)
                }
              >
                <SelectTrigger id="settings-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (EN)</SelectItem>
                  <SelectItem value="ru">Русский (RU)</SelectItem>
                  <SelectItem value="uz">O‘zbekcha (UZ)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Send className="size-5" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t("settings.telegramTitle")}</CardTitle>
              {user.telegramChatId && (
                <Badge variant="secondary">
                  <CircleCheck /> {t("settings.telegramConnected")}
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
                <Field
                  orientation="horizontal"
                  className="rounded-lg border p-3 sm:min-w-80"
                >
                  <FieldContent>
                    <FieldLabel htmlFor="telegram-notifications">
                      {t("settings.telegramNotifications")}
                    </FieldLabel>
                    <FieldDescription>
                      {t("settings.telegramNotificationsDescription")}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="telegram-notifications"
                    checked={user.telegramNotifications}
                    disabled={isUpdatingTelegram}
                    aria-label={t("settings.telegramNotifications")}
                    onCheckedChange={() => void toggleTelegramNotifications()}
                  />
                </Field>
                <Button
                  variant="outline"
                  disabled={isUpdatingTelegram}
                  onClick={() => void unlinkTelegram()}
                >
                  {isUpdatingTelegram ? (
                    <Spinner aria-label={t("common.loading")} />
                  ) : (
                    <Link2Off className="size-4" />
                  )}
                  {t("settings.telegramUnlink")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {!activeTelegramLink ? (
                  <Button
                    disabled={isConnectingTelegram}
                    onClick={() => void createTelegramLink()}
                  >
                    {isConnectingTelegram ? (
                      <Spinner aria-label={t("common.loading")} />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {t("settings.telegramConnect")}
                  </Button>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.telegramLinkExpires", {
                        code: activeTelegramLink.code,
                      })}
                    </p>
                    <Button
                      onClick={() =>
                        window.open(
                          activeTelegramLink.botUrl,
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
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>{t("settings.security")}</CardTitle>
            <CardDescription>
              {t("settings.securityDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={updatePassword}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="current-password">
                    {t("settings.currentPassword")}
                  </FieldLabel>
                  <Input
                    id="current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    maxLength={72}
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="new-password">
                      {t("settings.newPassword")}
                    </FieldLabel>
                    <Input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      {t("settings.confirmPassword")}
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      required
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword && (
                    <Spinner aria-label={t("common.loading")} />
                  )}
                  {t("settings.updatePassword")}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
