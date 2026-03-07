export const metadata = {
  title: "End-User License Agreement — StockPilot",
  description: "End-User License Agreement for StockPilot",
};

export default function EULAPage() {
  return (
    <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto text-sm text-foreground">
      <h1 className="text-2xl font-semibold mb-6">End-User License Agreement</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString("en-US")}</p>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <p>
          This End-User License Agreement (&quot;EULA&quot;) is a legal agreement between you (or your company) and the provider of StockPilot for the use of the StockPilot software and related services.
        </p>
        <p>
          By connecting your QuickBooks account or otherwise using StockPilot, you agree to be bound by this EULA. If you do not agree, do not use the software.
        </p>
        <h2 className="text-lg font-semibold mt-6">1. License Grant</h2>
        <p>
          Subject to this EULA, you are granted a limited, non-exclusive, non-transferable license to use StockPilot for your internal business purposes in connection with your QuickBooks data.
        </p>
        <h2 className="text-lg font-semibold mt-6">2. Restrictions</h2>
        <p>
          You may not reverse engineer, decompile, or disassemble the software, or use it for any purpose other than as permitted. You are responsible for maintaining the security of your credentials and data.
        </p>
        <h2 className="text-lg font-semibold mt-6">3. Data and Privacy</h2>
        <p>
          Use of QuickBooks data is subject to Intuit&apos;s terms and our Privacy Policy. We process data only as necessary to provide the analytics and sync features you use.
        </p>
        <h2 className="text-lg font-semibold mt-6">4. Disclaimer</h2>
        <p>
          The software is provided &quot;as is&quot; without warranty of any kind. The provider is not liable for any indirect or consequential damages arising from your use of StockPilot.
        </p>
        <h2 className="text-lg font-semibold mt-6">5. Contact</h2>
        <p>
          For questions about this EULA, contact the administrator of your StockPilot instance.
        </p>
      </div>
    </div>
  );
}
