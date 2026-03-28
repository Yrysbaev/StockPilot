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
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    counts?: Record<string, number>;
    error?: string;
    code?: string;
  } | null>(null);
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
      setSyncResult(null);
      setOauthMessage({
        type: "success",
        text: "You authorized StockPilot with QuickBooks. If Sync works, your data will load; if not, connect again (serverless hosts may need a second connect).",
      });
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

  const serverHasTokens = connected === true;
  /** Server checked and has no tokens; UI may still show Sync from browser OAuth session. */
  const serverSaysDisconnected = connected === false;
  const noTokensAfterSync = syncResult?.success === false && syncResult?.code === "NO_STORED_TOKENS";
  /** Hide the green OAuth banner once we know the server has no tokens (avoids contradicting the card). */
  const showOAuthSuccessBanner =
    oauthMessage?.type === "success" && !(serverSaysDisconnected || noTokensAfterSync);

  /** Load Connect URL whenever the server has not confirmed tokens (including reconnect after optimistic OAuth). */
  useEffect(() => {
    if (connected === true) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`/api/auth/quickbooks?redirect_uri=${encodeURIComponent(`${base}/api/auth/quickbooks/callback`)}`)
      .then((r) => r.json())
      .then((d) => setAuthUrl(d.authUrl ?? null))
      .catch(() => setAuthUrl(null));
  }, [connected]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncResult({ success: true, counts: json.counts });
        refreshStatus();
      } else setSyncResult({ success: false, error: json.error, code: json.code });
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
        {oauthMessage && (oauthMessage.type === "error" || showOAuthSuccessBanner) && (
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
                {noTokensAfterSync ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                      Sync needs credentials on this server
                    </p>
                    <p className="text-sm text-amber-900/90 dark:text-amber-100/90">
                      On serverless hosting, sign-in sometimes lands on a different instance than Sync. Connect once
                      more so tokens are written here, then run Sync again.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {authUrl ? (
                        <Button asChild className="w-full sm:w-auto">
                          <a href={authUrl}>Connect to QuickBooks</a>
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading connect link…</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSync}
                        disabled={syncing}
                        className="w-full sm:w-auto"
                      >
                        {syncing ? "Syncing…" : "Try Sync again"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {serverHasTokens ? (
                      <p className="text-sm text-emerald-600">
                        QuickBooks is connected on the server. You can sync anytime.
                      </p>
                    ) : connected === null ? (
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Checking whether this server has your QuickBooks credentials…
                      </p>
                    ) : (
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        This server does not have tokens yet (common on serverless). Try Sync, or connect again so
                        credentials are saved on the same instance.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 items-center">
                      <Button type="button" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
                        {syncing ? "Syncing…" : "Sync now"}
                      </Button>
                      {serverSaysDisconnected && authUrl && (
                        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                          <a href={authUrl}>Connect to QuickBooks</a>
                        </Button>
                      )}
                    </div>
                    {syncResult && (
                      <div className="text-sm space-y-2">
                        {syncResult.success ? (
                          <p className="text-muted-foreground">
                            Synced: {syncResult.counts?.customers ?? 0} customers, {syncResult.counts?.products ?? 0}{" "}
                            products, {syncResult.counts?.invoices ?? 0} invoices.
                          </p>
                        ) : (
                          <p className="text-destructive">{syncResult.error}</p>
                        )}
                      </div>
                    )}
                  </>
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
