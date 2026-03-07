import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { DateRangeProvider } from "@/contexts/DateRangeContext";

export const metadata: Metadata = {
  title: "StockPilot — Analytics",
  description: "Internal analytics for wholesale and distribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-background font-sans">
        <DateRangeProvider>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 pl-56">
              {children}
            </main>
          </div>
        </DateRangeProvider>
      </body>
    </html>
  );
}
