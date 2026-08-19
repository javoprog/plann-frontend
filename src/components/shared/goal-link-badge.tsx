import Link from "next/link";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Goal } from "@/lib/types";

export function GoalLinkBadge({
  goal,
}: {
  goal: Pick<Goal, "id" | "title">;
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5"
      render={
        <Link href={`/goals/${encodeURIComponent(goal.id)}`} />
      }
    >
      <Target />
      {goal.title}
    </Badge>
  );
}
