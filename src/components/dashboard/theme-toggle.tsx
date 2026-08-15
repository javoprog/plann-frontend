"use client";

import { useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getApiError } from "@/lib/api";

export function ThemeToggle() {
  const { resolvedTheme } = useTheme();
  const { changeTheme } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  async function toggleTheme() {
    setIsSaving(true);
    try {
      await changeTheme(resolvedTheme === "dark" ? "light" : "dark");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => void toggleTheme()}
      disabled={!mounted || isSaving}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
