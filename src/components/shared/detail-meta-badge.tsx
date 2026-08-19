import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function DetailMetaBadge({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className="shrink-0 gap-2 px-3 py-2 text-sm font-normal"
    >
      <Icon className="text-muted-foreground" />
      {children}
    </Badge>
  );
}
