export const metadata = {
  title: "Privacy Policy — StockPilot",
  description: "Privacy Policy for StockPilot",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-8 max-w-3xl mx-auto text-sm text-foreground">
      <h1 className="text-2xl font-semibold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString("en-US")}</p>
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <p>
          This Privacy Policy describes how StockPilot collects, uses, and protects information when you use our analytics application and connect your QuickBooks account.
        </p>
        <h2 className="text-lg font-semibold mt-6">1. Information We Process</h2>
        <p>
          StockPilot accesses data from your QuickBooks account (such as customers, invoices, products, and inventory) only after you explicitly connect your company and authorize access through Intuit&apos;s OAuth flow. We use this data solely to provide analytics, dashboards, and sync features within your instance of StockPilot.
        </p>
        <h2 className="text-lg font-semibold mt-6">2. How We Use Data</h2>
        <p>
          Data from QuickBooks is used to compute metrics, generate insights, and display reports within your organization. Synced data may be stored locally (e.g. on your server or in your chosen database) for performance. We do not sell or share your business data with third parties for advertising or other commercial purposes unrelated to providing the service.
        </p>
        <h2 className="text-lg font-semibold mt-6">3. Data Retention and Security</h2>
        <p>
          You control how long synced data is retained. Credentials (e.g. OAuth tokens) are stored securely and used only to refresh access and perform sync operations. We recommend that StockPilot be deployed in a secure environment with appropriate access controls.
        </p>
        <h2 className="text-lg font-semibold mt-6">4. Intuit and Third Parties</h2>
        <p>
          Your use of QuickBooks is subject to Intuit&apos;s privacy policy and terms. StockPilot&apos;s integration with QuickBooks is performed using Intuit&apos;s official APIs and OAuth; we do not store your Intuit login credentials.
        </p>
        <h2 className="text-lg font-semibold mt-6">5. Your Rights</h2>
        <p>
          You may disconnect QuickBooks at any time (e.g. by revoking access in your Intuit account or clearing stored tokens). You may also delete any locally synced data. For questions or requests regarding your data, contact the administrator of your StockPilot instance.
        </p>
        <h2 className="text-lg font-semibold mt-6">6. Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at the top reflects the latest revision. Continued use of StockPilot after changes constitutes acceptance of the updated policy.
        </p>
      </div>
    </div>
  );
}
