"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        {children && (
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
            {children}
          </div>
        )}
        {sort && (
          <div className="w-full shrink-0 xl:ml-auto xl:w-52">{sort}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function CollectionFilter<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  label: string;
  value: Value;
  options: readonly CollectionOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string;
}) {
  return (
    <FieldSet className={cn("min-w-0 gap-2", className)}>
      <FieldLegend variant="label" className="text-xs text-muted-foreground">
        {label}
      </FieldLegend>
      <ToggleGroup
        variant="outline"
        size="sm"
        value={[value]}
        onValueChange={(values) => {
          const nextValue = values.at(-1) as Value | undefined;
          if (nextValue) onValueChange(nextValue);
        }}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </FieldSet>
  );
}

export function CollectionSort<Value extends string>({
  id,
  label,
  value,
  options,
  onValueChange,
}: {
  id: string;
  label: string;
  value: Value;
  options: readonly CollectionOption<Value>[];
  onValueChange: (value: Value) => void;
}) {
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as Value)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
