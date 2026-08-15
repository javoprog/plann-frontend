import {
  Briefcase,
  GraduationCap,
  HeartPulse,
  Plane,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMetadata {
  name: string;
  color: string;
  icon: LucideIcon;
  badgeClassName: string;
  dotClassName: string;
}

export const CATEGORY_METADATA: CategoryMetadata[] = [
  {
    name: "Work",
    color: "#3B82F6",
    icon: Briefcase,
    badgeClassName:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
    dotClassName: "bg-blue-500",
  },
  {
    name: "Education",
    color: "#8B5CF6",
    icon: GraduationCap,
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
    dotClassName: "bg-violet-500",
  },
  {
    name: "Personal",
    color: "#10B981",
    icon: UserRound,
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  {
    name: "Travel",
    color: "#F59E0B",
    icon: Plane,
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    dotClassName: "bg-amber-500",
  },
  {
    name: "Health",
    color: "#F43F5E",
    icon: HeartPulse,
    badgeClassName:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300",
    dotClassName: "bg-rose-500",
  },
];

const fallbackMetadata: CategoryMetadata = {
  name: "Other",
  color: "#64748B",
  icon: UserRound,
  badgeClassName:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  dotClassName: "bg-slate-500",
};

export function getCategoryMetadata(name?: string | null) {
  return (
    CATEGORY_METADATA.find((category) => category.name === name) ??
    fallbackMetadata
  );
}
