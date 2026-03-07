"use client";

import { Suspense } from "react";
import { DashboardHeader } from "./DashboardHeader";

/**
 * Wraps DashboardHeader in Suspense so useSearchParams() works during static generation.
 */
export function DashboardHeaderWithSuspense({ title }: { title: string }) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="h-10 w-[180px] rounded-md border bg-muted/50" />
        </header>
      }
    >
      <DashboardHeader title={title} />
    </Suspense>
  );
}
