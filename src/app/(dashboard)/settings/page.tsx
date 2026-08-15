"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Palette, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
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
import type { ThemePreference, User } from "@/lib/types";

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export default function SettingsPage() {
  const { user, updateUser, changeTheme } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

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
      toast.success("Profile updated");
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
      toast.error("New passwords do not match");
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
      toast.success("Password updated");
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
      toast.success(`Theme set to ${themeLabels[theme].toLowerCase()}`);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSavingTheme(false);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences
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
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update the name and email attached to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={`${user.name}-${user.email}`}
              className="space-y-4"
              onSubmit={saveProfile}
            >
              <div className="space-y-2">
                <Label htmlFor="settings-name">Name</Label>
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
                <Label htmlFor="settings-email">Email</Label>
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
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Palette className="size-5" />
            </div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose how Plann looks. Your preference is saved to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={user.theme}
              disabled={isSavingTheme}
              onValueChange={(value) =>
                void updateTheme(value as ThemePreference)
              }
            >
              <SelectTrigger className="w-full">
                <span>{themeLabels[user.theme]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              System follows the appearance preference of your device.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Change your password after confirming your current one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={updatePassword}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="current-password">Current Password</Label>
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
                <Label htmlFor="new-password">New Password</Label>
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
                <Label htmlFor="confirm-password">Confirm Password</Label>
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
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
