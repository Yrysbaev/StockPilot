"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRESET_LABELS } from "@/lib/metrics/date-range";
import type { DateRangePreset } from "@/types";

interface DateRangeFilterProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  className?: string;
}

const presets: DateRangePreset[] = ["7d", "30d", "90d", "this_month", "last_month"];

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangePreset)}>
      <SelectTrigger className={className ?? "w-[180px]"}>
        <SelectValue placeholder="Date range" />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p} value={p}>
            {PRESET_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
