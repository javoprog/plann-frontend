"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
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
import { getApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      await login(String(formData.get("email")), String(formData.get("password")));
      toast.success(t("toast.welcomeBack"));
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-black/5">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">{t("auth.welcome")}</CardTitle>
        <CardDescription>
          {t("auth.loginDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {t("auth.signIn")} <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.newToPlann")}{" "}
          <Link className="font-medium text-foreground hover:underline" href="/register">
            {t("auth.createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
