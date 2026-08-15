import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <CheckCircle2 className="size-5" />
      </span>
      <span className="text-xl font-bold tracking-tight">Plann</span>
    </div>
  );
}
