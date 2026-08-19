"use client";

import type { ComponentProps, ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CollectionOption<Value extends string = string> {
  value: Value;
  label: string;
}

export function CollectionToolbar({
  children,
  sort,
}: {
  children?: ReactNode;
  sort?: ReactNode;
}) {
  return (
    <Card size="sm" className="py-2">
      <CardContent className="flex flex-wrap items-center gap-2 px-2">
        {children && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <SlidersHorizontal
              className="mx-1 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {children}
          </div>
        )}
        {sort && <div className="ml-auto shrink-0">{sort}</div>}
      </CardContent>
    </Card>
  );
}

function CollectionSelect<Value extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  id?: string;
  label: string;
  value: Value;
  options: readonly CollectionOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as Value)}
    >
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={label}
        className={cn("min-w-32 max-w-56", className)}
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type CollectionSelectProps<Value extends string> = ComponentProps<
  typeof CollectionSelect<Value>
>;

export function CollectionFilter<Value extends string>(
  props: Omit<CollectionSelectProps<Value>, "id">,
) {
  return <CollectionSelect {...props} />;
}

export function CollectionSort<Value extends string>({
  id,
  ...props
}: CollectionSelectProps<Value> & { id: string }) {
  return <CollectionSelect id={id} {...props} />;
}
