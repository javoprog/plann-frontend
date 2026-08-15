import { Badge } from "@/components/ui/badge";
import { getCategoryMetadata } from "@/lib/constants/categories";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
}: {
  category?: Category | null;
  className?: string;
}) {
  if (!category) return null;
  const metadata = getCategoryMetadata(category.name);
  const Icon = metadata.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5", metadata.badgeClassName, className)}
    >
      <Icon className="size-3" />
      {category.name}
    </Badge>
  );
}
