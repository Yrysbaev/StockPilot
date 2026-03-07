"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DateRangeFilter } from "./DateRangeFilter";
import { useDateRange } from "@/contexts/DateRangeContext";
import type { DateRangePreset } from "@/types";

export function DashboardHeader({ title }: { title: string }) {
  const { preset, setPreset } = useDateRange();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const range = searchParams.get("range") as DateRangePreset | null;
    if (range && ["7d", "30d", "90d", "this_month", "last_month"].includes(range) && range !== preset) {
      setPreset(range);
    }
  }, [searchParams, preset, setPreset]);

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", newPreset);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
      <h1 className="text-lg font-semibold">{title}</h1>
      <DateRangeFilter value={preset} onChange={handlePresetChange} />
    </header>
  );
}
