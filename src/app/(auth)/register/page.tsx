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

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      confirmPassword: String(formData.get("confirmPassword")),
    };

    if (input.password !== input.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(input);
      toast.success("Your account is ready");
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
        <CardTitle className="text-2xl">
          {t("auth.registerTitle")}
        </CardTitle>
        <CardDescription>
          {t("auth.registerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.name")}</Label>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              autoComplete="name"
              minLength={2}
              required
            />
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8+ characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.confirm")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {t("auth.createAccount")} <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("auth.alreadyAccount")}{" "}
          <Link className="font-medium text-foreground hover:underline" href="/login">
            {t("auth.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
