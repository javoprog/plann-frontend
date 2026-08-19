"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
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
      toast.error(t("toast.passwordsDoNotMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await register(input);
      toast.success(t("toast.accountReady"));
      router.replace("/dashboard");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">
          {t("auth.registerTitle")}
        </CardTitle>
        <CardDescription>
          {t("auth.registerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">{t("settings.name")}</FieldLabel>
            <Input
              id="name"
              name="name"
              placeholder={t("auth.namePlaceholder")}
              autoComplete="name"
              minLength={2}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{t("settings.email")}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="password">{t("auth.password")}</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("auth.newPasswordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">{t("auth.confirm")}</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner aria-label={t("common.loading")} />}
            {t("auth.createAccount")}
            {!isSubmitting && <ArrowRight />}
          </Button>
          </FieldGroup>
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
