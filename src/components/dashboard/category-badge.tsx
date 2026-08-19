"use client";

import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import {
  getCategoryLabel,
  getCategoryMetadata,
} from "@/lib/constants/categories";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
}: {
  category?: Category | null;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!category) return null;
  const metadata = getCategoryMetadata(category.name);
  const Icon = metadata.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", className)}
    >
      <Icon className="size-3" />
      {getCategoryLabel(category.name, t)}
    </Badge>
  );
}
