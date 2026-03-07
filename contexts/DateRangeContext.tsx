"use client";

import * as React from "react";
import { getDateRangeFromPreset } from "@/lib/metrics/date-range";
import type { DateRange, DateRangePreset } from "@/types";

interface DateRangeContextValue {
  preset: DateRangePreset;
  setPreset: (p: DateRangePreset) => void;
  range: DateRange;
}

const DateRangeContext = React.createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = React.useState<DateRangePreset>("30d");
  const range = React.useMemo(() => getDateRangeFromPreset(preset), [preset]);
  const value = React.useMemo(
    () => ({ preset, setPreset, range }),
    [preset, range]
  );
  return (
    <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = React.useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
