import {
  Briefcase,
  GraduationCap,
  HeartPulse,
  Plane,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

export interface CategoryMetadata {
  name: string;
  label: TranslationKey;
  icon: LucideIcon;
}

export const CATEGORY_METADATA: CategoryMetadata[] = [
  { name: "Work", label: "categories.work", icon: Briefcase },
  {
    name: "Education",
    label: "categories.education",
    icon: GraduationCap,
  },
  { name: "Personal", label: "categories.personal", icon: UserRound },
  { name: "Travel", label: "categories.travel", icon: Plane },
  { name: "Health", label: "categories.health", icon: HeartPulse },
];

const fallbackMetadata: CategoryMetadata = {
  name: "Other",
  label: "categories.personal",
  icon: UserRound,
};

export function getCategoryMetadata(name?: string | null) {
  return (
    CATEGORY_METADATA.find((category) => category.name === name) ??
    fallbackMetadata
  );
}

export function getCategoryLabel(
  name: string,
  translate: (key: TranslationKey) => string,
) {
  const metadata = CATEGORY_METADATA.find((category) => category.name === name);
  return metadata ? translate(metadata.label) : name;
}
