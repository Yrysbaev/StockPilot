"use client";

import { useState, useEffect } from "react";
import { DashboardHeaderWithSuspense } from "@/components/layout/DashboardHeaderWithSuspense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; counts?: Record<string, number>; error?: string } | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/qb/status")
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!connected) {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      fetch(`/api/auth/quickbooks?redirect_uri=${encodeURIComponent(`${base}/api/auth/quickbooks/callback`)}`)
        .then((r) => r.json())
        .then((d) => setAuthUrl(d.authUrl ?? null))
        .catch(() => setAuthUrl(null));
    }
  }, [connected]);

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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QuickBooks data</CardTitle>
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks company and sync data to power the dashboards.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {connected === null && <p className="text-sm text-muted-foreground">Checking connection…</p>}
            {connected === true && (
              <>
                <p className="text-sm text-emerald-600">Connected to QuickBooks.</p>
                <Button onClick={handleSync} disabled={syncing}>
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
            {connected === false && authUrl && (
              <>
                <p className="text-sm text-muted-foreground">Not connected. Connect your QuickBooks company to pull real data.</p>
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
