"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <DashboardHeaderWithSuspense title="Settings" />
          <div className="p-6 text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

const STORAGE_KEY = "stockpilot_qb_connected";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<boolean | null>(null);
  /** Survives Vercel cold instances where /api/qb/status may not see /tmp tokens yet. */
  const [persistedOAuth, setPersistedOAuth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; counts?: Record<string, number>; error?: string } | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshStatus = useCallback(() => {
    fetch("/api/qb/status")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1") {
      setPersistedOAuth(true);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const connectedParam = searchParams.get("qb_connected");
    const errorParam = searchParams.get("qb_error");
    if (connectedParam === "1") {
      setOauthMessage({ type: "success", text: "QuickBooks connected. You can run Sync now to pull your data." });
      setConnected(true);
      setPersistedOAuth(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
      router.replace("/settings", { scroll: false });
    } else if (errorParam) {
      setOauthMessage({ type: "error", text: decodeURIComponent(errorParam) });
      router.replace("/settings", { scroll: false });
    }
  }, [searchParams, router]);

  const qpJustConnected = searchParams.get("qb_connected") === "1";
  const showSyncSection =
    connected === true ||
    oauthMessage?.type === "success" ||
    persistedOAuth ||
    qpJustConnected;

  useEffect(() => {
    if (!showSyncSection) {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      fetch(`/api/auth/quickbooks?redirect_uri=${encodeURIComponent(`${base}/api/auth/quickbooks/callback`)}`)
        .then((r) => r.json())
        .then((d) => setAuthUrl(d.authUrl ?? null))
        .catch(() => setAuthUrl(null));
    }
  }, [showSyncSection]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) setSyncResult({ success: true, counts: json.counts });
      else setSyncResult({ success: false, error: json.error });
    } catch (e) {
      setSyncResult({ success: false, error: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeaderWithSuspense title="Settings" />
      <div className="p-6 max-w-xl space-y-6">
        {oauthMessage && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              oauthMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
            }`}
          >
            {oauthMessage.text}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QuickBooks data</CardTitle>
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks company and sync data to power the dashboards.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {connected === null && !showSyncSection && (
              <p className="text-sm text-muted-foreground">Checking connection…</p>
            )}
            {showSyncSection && (
              <>
                <p className="text-sm text-emerald-600">Connected to QuickBooks.</p>
                <Button type="button" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
                  {syncing ? "Syncing…" : "Sync now"}
                </Button>
                {syncResult && (
                  <div className="text-sm">
                    {syncResult.success ? (
                      <p className="text-muted-foreground">
                        Synced: {syncResult.counts?.customers ?? 0} customers, {syncResult.counts?.products ?? 0} products,{" "}
                        {syncResult.counts?.invoices ?? 0} invoices.
                      </p>
                    ) : (
                      <p className="text-destructive">{syncResult.error}</p>
                    )}
                  </div>
                )}
              </>
            )}
            {!showSyncSection && connected === false && authUrl && (
              <>
                <p className="text-sm text-muted-foreground">Not connected. Connect your QuickBooks company to pull real data.</p>
                <p className="text-xs text-muted-foreground">
                  Add this <strong>exact</strong> Redirect URI in your Intuit app (Keys &amp; credentials → Redirect URIs):
                </p>
                <code className="block text-xs bg-muted px-2 py-2 rounded break-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/api/auth/quickbooks/callback` : ""}
                </code>
                <Button asChild>
                  <a href={authUrl}>Connect to QuickBooks</a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to Intuit to sign in and authorize. After that, return here and run Sync.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
